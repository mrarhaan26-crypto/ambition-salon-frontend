import { Injectable } from '@angular/core';
import type { DragSession } from './calendar-drag-state.service';

export type DragEventType =
  | 'drag:start'
  | 'drag:move'
  | 'drag:end'
  | 'drag:cancel'
  | 'resize:start'
  | 'resize:move'
  | 'resize:end'
  | 'resize:cancel'
  | 'drop:complete'
  | 'appointment:updated'
  | 'snap:changed';

export interface DragEventPayload {
  type: DragEventType;
  session: Readonly<DragSession>;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export type DragEventHandler = (event: DragEventPayload) => void;

@Injectable({ providedIn: 'root' })
export class DragEventSystem {
  private handlers = new Map<DragEventType, Set<DragEventHandler>>();
  private allHandlers = new Set<DragEventHandler>();

  on(type: DragEventType, handler: DragEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onAny(handler: DragEventHandler): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  emit(type: DragEventType, session: Readonly<DragSession>, metadata?: Record<string, unknown>): void {
    const payload: DragEventPayload = { type, session, timestamp: Date.now(), metadata };
    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const h of handlers) {
        try { h(payload); } catch { /* handler error */ }
      }
    }
    for (const h of this.allHandlers) {
      try { h(payload); } catch { /* handler error */ }
    }
  }

  removeAll(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }
}
