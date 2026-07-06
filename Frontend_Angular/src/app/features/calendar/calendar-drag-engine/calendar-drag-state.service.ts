import { Injectable } from '@angular/core';
import type { SnapInterval } from './calendar-snap-engine';

export type DragMode = 'idle' | 'dragging' | 'resizing-top' | 'resizing-bottom';
export type DragInputType = 'mouse' | 'touch' | 'keyboard' | 'longpress';

export interface DragPosition {
  clientX: number;
  clientY: number;
  date: Date;
  staffId: string;
  hour: number;
  minutes: number;
}

export interface DragTarget {
  appointmentId: string;
  staffId: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  title: string;
}

export interface DragSession {
  mode: DragMode;
  inputType: DragInputType;
  target: DragTarget;
  origin: DragPosition;
  current: DragPosition;
  snappedStart: string;
  snappedEnd: string;
  deltaMinutes: number;
  cancelled: boolean;
  isLongPress: boolean;
  longPressTimer: ReturnType<typeof setTimeout> | null;
  resizeEdge: 'top' | 'bottom' | null;
  liveDurationMinutes: number;
}

export function createEmptyDragSession(): DragSession {
  return {
    mode: 'idle',
    inputType: 'mouse',
    target: {
      appointmentId: '',
      staffId: '',
      startTime: '',
      endTime: '',
      durationMinutes: 0,
      title: '',
    },
    origin: {
      clientX: 0,
      clientY: 0,
      date: new Date(),
      staffId: '',
      hour: 0,
      minutes: 0,
    },
    current: {
      clientX: 0,
      clientY: 0,
      date: new Date(),
      staffId: '',
      hour: 0,
      minutes: 0,
    },
    snappedStart: '',
    snappedEnd: '',
    deltaMinutes: 0,
    cancelled: false,
    isLongPress: false,
    longPressTimer: null,
    resizeEdge: null,
    liveDurationMinutes: 0,
  };
}

@Injectable({ providedIn: 'root' })
export class DragStateService {
  private session: DragSession = createEmptyDragSession();
  private listeners: Array<() => void> = [];
  snapInterval: SnapInterval = 15;

  get current(): Readonly<DragSession> {
    return this.session;
  }

  get isDragging(): boolean {
    return this.session.mode === 'dragging';
  }

  get isResizing(): boolean {
    return this.session.mode === 'resizing-top' || this.session.mode === 'resizing-bottom';
  }

  get isActive(): boolean {
    return this.session.mode !== 'idle';
  }

  get targetAppointmentId(): string {
    return this.session.target.appointmentId;
  }

  get cancelled(): boolean {
    return this.session.cancelled;
  }

  startDrag(session: Partial<DragSession>): void {
    this.session = { ...createEmptyDragSession(), ...session, mode: 'dragging', cancelled: false };
    this.notify();
  }

  startResize(session: Partial<DragSession>, edge: 'top' | 'bottom'): void {
    this.session = {
      ...createEmptyDragSession(),
      ...session,
      mode: edge === 'top' ? 'resizing-top' : 'resizing-bottom',
      resizeEdge: edge,
      cancelled: false,
    };
    this.notify();
  }

  updatePosition(position: Partial<DragPosition>): void {
    this.session.current = { ...this.session.current, ...position };
    this.notify();
  }

  updateSnapped(snappedStart: string, snappedEnd: string): void {
    this.session.snappedStart = snappedStart;
    this.session.snappedEnd = snappedEnd;
    const origDuration = this.session.target.durationMinutes;
    const newDuration = this.getDurationMinutes(snappedStart, snappedEnd);
    this.session.deltaMinutes = newDuration - origDuration;
    this.session.liveDurationMinutes = newDuration;
    this.notify();
  }

  cancelDrag(): void {
    this.session.cancelled = true;
    this.notify();
  }

  endDrag(): void {
    this.clearLongPress();
    this.session.mode = 'idle';
    this.notify();
  }

  clear(): void {
    this.clearLongPress();
    this.session = createEmptyDragSession();
    this.notify();
  }

  setLongPressTimer(timer: ReturnType<typeof setTimeout>): void {
    this.clearLongPress();
    this.session.longPressTimer = timer;
    this.session.isLongPress = true;
  }

  clearLongPress(): void {
    if (this.session.longPressTimer !== null) {
      clearTimeout(this.session.longPressTimer);
      this.session.longPressTimer = null;
    }
    this.session.isLongPress = false;
  }

  onChange(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }

  private getDurationMinutes(start: string, end: string): number {
    return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
  }
}
