import { Injectable, NgZone, inject } from '@angular/core';
import { DragStateService, type DragSession, type DragTarget, type DragPosition } from './calendar-drag-state.service';
import { DragEventSystem, type DragEventType } from './calendar-drag-events-system';
import { AutoScrollService } from './calendar-auto-scroll.service';
import { DragVisualService } from './calendar-drag-visual.service';
import { CommandHistoryService, type DragCommand } from './calendar-command-history.service';
import { snapDate, snapMinutes, clampDuration, getDurationMinutes, type SnapInterval } from './calendar-snap-engine';

export interface ViewCoordinateAdapter {
  getContainer(): HTMLElement;
  yToTime(clientY: number, containerEl: HTMLElement): { date: Date; minutes: number; hour: number };
  xToStaffId(clientX: number, containerEl: HTMLElement): string;
  getAppointmentElement(appointmentId: string): HTMLElement | null;
  getStaffColor(staffId: string): string;
  onAppointmentUpdated(appointmentId: string, newStart: string, newEnd: string, newStaffId?: string): void;
}

@Injectable({ providedIn: 'root' })
export class DragEngineService {
  private state = inject(DragStateService);
  private events = inject(DragEventSystem);
  private autoScroll = inject(AutoScrollService);
  private visual = inject(DragVisualService);
  private commandHistory = inject(CommandHistoryService);
  private ngZone = inject(NgZone);

  private adapter: ViewCoordinateAdapter | null = null;
  private boundOnMove: ((e: PointerEvent) => void) | null = null;
  private boundOnUp: ((e: PointerEvent) => void) | null = null;
  private boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private animFrameId: number | null = null;

  get stateService(): DragStateService { return this.state; }
  get eventSystem(): DragEventSystem { return this.events; }
  get autoScrollService(): AutoScrollService { return this.autoScroll; }
  get visualService(): DragVisualService { return this.visual; }
  get commandHistoryService(): CommandHistoryService { return this.commandHistory; }
  get snapInterval(): SnapInterval { return this.state.snapInterval; }

  setSnapInterval(interval: SnapInterval): void {
    this.state.snapInterval = interval;
    this.events.emit('snap:changed', this.state.current, { interval });
  }

  registerAdapter(adapter: ViewCoordinateAdapter): void {
    this.adapter = adapter;
  }

  unregisterAdapter(): void {
    this.adapter = null;
  }

  startDrag(target: DragTarget, clientX: number, clientY: number, inputType: 'mouse' | 'touch' | 'keyboard' | 'longpress' = 'mouse'): void {
    if (!this.adapter) return;
    const container = this.adapter.getContainer();
    const pos = this.clientToPosition(clientX, clientY, container);

    this.state.startDrag({ target, inputType, origin: pos, current: pos });
    this.state.updateSnapped(target.startTime, target.endTime);

    this.events.emit('drag:start', this.state.current, { clientX, clientY });
    this.visual.showGhost({
      title: target.title,
      color: this.adapter.getStaffColor(target.staffId) || '#6366f1',
      startTime: target.startTime,
      endTime: target.endTime,
      durationMinutes: target.durationMinutes,
      isResize: false,
      resizeEdge: null,
    });

    this.setupPointerListeners(clientX, clientY);
  }

  startResize(target: DragTarget, edge: 'top' | 'bottom', clientX: number, clientY: number): void {
    if (!this.adapter) return;

    this.state.startResize({ target, inputType: 'mouse', origin: { clientX, clientY, date: new Date(), staffId: target.staffId, hour: 0, minutes: 0 }, current: { clientX, clientY, date: new Date(), staffId: target.staffId, hour: 0, minutes: 0 } }, edge);
    this.state.updateSnapped(target.startTime, target.endTime);

    this.events.emit('resize:start', this.state.current, { edge });
    this.visual.showGhost({
      title: target.title,
      color: this.adapter.getStaffColor(target.staffId) || '#6366f1',
      startTime: target.startTime,
      endTime: target.endTime,
      durationMinutes: target.durationMinutes,
      isResize: true,
      resizeEdge: edge,
    });

    this.setupPointerListeners(clientX, clientY);
  }

  cancelDrag(): void {
    this.state.cancelDrag();
    this.events.emit('drag:cancel', this.state.current);
    this.visual.hideGhost();
    this.visual.hideHighlight();
    this.cleanupPointerListeners();
    this.autoScroll.stop();
    this.state.endDrag();
  }

  completeDrag(): void {
    if (this.state.cancelled) {
      this.cancelDrag();
      return;
    }

    const session = this.state.current;
    const command: DragCommand = {
      id: crypto.randomUUID?.() || Date.now().toString(),
      type: session.mode === 'dragging' ? 'move' : 'resize',
      timestamp: Date.now(),
      appointmentId: session.target.appointmentId,
      previous: {
        staffId: session.target.staffId,
        startTime: session.target.startTime,
        endTime: session.target.endTime,
      },
      current: {
        staffId: session.current.staffId || session.target.staffId,
        startTime: session.snappedStart || session.target.startTime,
        endTime: session.snappedEnd || session.target.endTime,
      },
    };

    this.commandHistory.push(command);
    this.events.emit('drop:complete', session, { command });
    this.events.emit('appointment:updated', session, { command });

    if (this.adapter) {
      this.adapter.onAppointmentUpdated(
        command.current.staffId !== command.previous.staffId ? command.current.staffId : command.previous.staffId,
        command.current.startTime,
        command.current.endTime,
        command.current.staffId,
      );
    }

    this.visual.hideGhost();
    this.visual.hideHighlight();
    this.cleanupPointerListeners();
    this.autoScroll.stop();
    this.state.endDrag();
  }

  undoLast(): DragCommand | null {
    const cmd = this.commandHistory.undo();
    if (cmd && this.adapter) {
      this.adapter.onAppointmentUpdated(
        cmd.previous.staffId,
        cmd.previous.startTime,
        cmd.previous.endTime,
        cmd.previous.staffId,
      );
    }
    return cmd;
  }

  redoLast(): DragCommand | null {
    const cmd = this.commandHistory.redo();
    if (cmd && this.adapter) {
      this.adapter.onAppointmentUpdated(
        cmd.current.staffId,
        cmd.current.startTime,
        cmd.current.endTime,
        cmd.current.staffId,
      );
    }
    return cmd;
  }

  private setupPointerListeners(initialX: number, initialY: number): void {
    this.cleanupPointerListeners();

    this.ngZone.runOutsideAngular(() => {
      this.boundOnMove = (e: PointerEvent) => this.onPointerMove(e);
      this.boundOnUp = (e: PointerEvent) => this.onPointerUp(e);
      this.boundOnKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);

      document.addEventListener('pointermove', this.boundOnMove, { passive: true });
      document.addEventListener('pointerup', this.boundOnUp, { passive: true });
      document.addEventListener('pointercancel', this.boundOnUp, { passive: true });
      document.addEventListener('keydown', this.boundOnKeyDown);
    });

    this.updateGhostPosition(initialX, initialY);
  }

  private cleanupPointerListeners(): void {
    if (this.boundOnMove) {
      document.removeEventListener('pointermove', this.boundOnMove);
      this.boundOnMove = null;
    }
    if (this.boundOnUp) {
      document.removeEventListener('pointerup', this.boundOnUp);
      document.removeEventListener('pointercancel', this.boundOnUp);
      this.boundOnUp = null;
    }
    if (this.boundOnKeyDown) {
      document.removeEventListener('keydown', this.boundOnKeyDown);
      this.boundOnKeyDown = null;
    }
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.state.cancelled) return;
    if (!this.adapter) return;

    const container = this.adapter.getContainer();
    const pos = this.clientToPosition(e.clientX, e.clientY, container);

    this.state.updatePosition(pos);

    const autoScrollDir = this.autoScroll.update(e.clientX, e.clientY);
    const session = this.state.current;

    if (this.state.isResizing) {
      const snappedStart = session.resizeEdge === 'bottom' ? session.target.startTime : snapDate(pos.date).toISOString();
      const snappedEnd = session.resizeEdge === 'top' ? session.target.endTime : this.computeResizeEnd(pos, session);
      this.state.updateSnapped(snappedStart, snappedEnd);
    } else {
      const snapped = snapDate(pos.date).toISOString();
      const origEnd = new Date(session.target.startTime).getTime() + session.target.durationMinutes * 60000;
      const delta = pos.date.getTime() - session.origin.date.getTime();
      const newStart = new Date(new Date(session.target.startTime).getTime() + delta);
      const newEnd = new Date(origEnd + delta);
      this.state.updateSnapped(newStart.toISOString(), newEnd.toISOString());
      this.state.updatePosition({ ...pos, staffId: this.adapter.xToStaffId(e.clientX, container) || pos.staffId });
    }

    this.events.emit(this.state.isResizing ? 'resize:move' : 'drag:move', this.state.current);

    this.updateGhostPosition(e.clientX + (autoScrollDir.x !== 0 || autoScrollDir.y !== 0 ? 0 : 0), e.clientY);
  }

  private onPointerUp(_e: PointerEvent): void {
    if (this.state.cancelled) return;
    this.completeDrag();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancelDrag();
      return;
    }
    if (this.state.isActive && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      this.nudgeDrag(e.key === 'ArrowUp' ? -this.state.snapInterval : this.state.snapInterval);
    }
  }

  private nudgeDrag(deltaMinutes: number): void {
    if (!this.adapter) return;
    const session = this.state.current;
    const currentStart = new Date(session.snappedStart || session.target.startTime);
    const currentEnd = new Date(session.snappedEnd || session.target.endTime);
    const duration = getDurationMinutes(session.target.startTime, session.target.endTime);

    const newStart = new Date(currentStart.getTime() + deltaMinutes * 60000);
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    this.state.updateSnapped(newStart.toISOString(), newEnd.toISOString());
    this.events.emit('drag:move', this.state.current);
  }

  private computeResizeEnd(pos: DragPosition, session: Readonly<DragSession>): string {
    const baseTime = session.resizeEdge === 'bottom'
      ? new Date(session.target.startTime).getTime()
      : pos.date.getTime();
    const endTime = session.resizeEdge === 'bottom'
      ? pos.date.getTime()
      : new Date(session.target.endTime).getTime();
    const duration = Math.abs(endTime - baseTime) / 60000;
    const clamped = clampDuration(Math.round(duration / this.state.snapInterval) * this.state.snapInterval);
    return new Date(baseTime + clamped * 60000).toISOString();
  }

  private updateGhostPosition(clientX: number, clientY: number): void {
    if (this.animFrameId !== null) return;
    this.animFrameId = requestAnimationFrame(() => {
      this.animFrameId = null;
      this.visual.updateGhostPosition(clientX, clientY);
    });
  }

  private clientToPosition(clientX: number, clientY: number, container: HTMLElement): DragPosition {
    const rect = container.getBoundingClientRect();
    const relativeY = clientY - rect.top + container.scrollTop;
    const minutes = Math.max(0, (relativeY / 60) * 60);
    const hour = Math.floor(minutes / 60);
    const date = new Date();
    date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

    return {
      clientX,
      clientY,
      date,
      staffId: '',
      hour,
      minutes,
    };
  }
}
