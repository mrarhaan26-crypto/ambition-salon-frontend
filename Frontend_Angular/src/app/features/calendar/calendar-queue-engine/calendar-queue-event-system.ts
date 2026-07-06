import { Injectable } from '@angular/core';
import type { QueueEntry, CheckInResult } from './calendar-queue.models';

export type QueueEventType =
  | 'queue:joined'
  | 'queue:checked_in'
  | 'queue:called'
  | 'queue:assigned'
  | 'queue:in_service'
  | 'queue:completed'
  | 'queue:cancelled'
  | 'queue:no_show'
  | 'queue:reordered'
  | 'queue:priority_changed'
  | 'queue:hold'
  | 'queue:resume';

export interface QueueEventPayload {
  type: QueueEventType;
  timestamp: number;
  entry: QueueEntry;
  previousStatus?: string;
  checkInResult?: CheckInResult;
  metadata?: Record<string, unknown>;
}

export type QueueEventHandler = (event: QueueEventPayload) => void;

@Injectable({ providedIn: 'root' })
export class QueueEventSystem {
  private handlers = new Map<QueueEventType, Set<QueueEventHandler>>();
  private allHandlers = new Set<QueueEventHandler>();

  on(type: QueueEventType, handler: QueueEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onAny(handler: QueueEventHandler): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  emit(type: QueueEventType, payload: Partial<QueueEventPayload>): void {
    const event: QueueEventPayload = {
      type,
      timestamp: Date.now(),
      entry: payload.entry!,
      ...payload,
    };

    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const h of handlers) {
        try { h(event); } catch { /* handler error */ }
      }
    }
    for (const h of this.allHandlers) {
      try { h(event); } catch { /* handler error */ }
    }
  }

  removeAll(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }
}
