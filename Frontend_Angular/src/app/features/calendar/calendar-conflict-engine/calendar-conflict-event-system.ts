import { Injectable } from '@angular/core';
import type { ConflictReport, ConflictItem, OverrideDecision, ValidationContext } from './calendar-conflict.models';

export type ConflictEventType =
  | 'conflict:detected'
  | 'conflict:resolved'
  | 'move:rejected'
  | 'move:accepted'
  | 'resize:rejected'
  | 'resize:accepted'
  | 'creation:rejected'
  | 'creation:accepted'
  | 'availability:changed'
  | 'override:granted'
  | 'override:denied';

export interface ConflictEventPayload {
  type: ConflictEventType;
  timestamp: number;
  report?: ConflictReport;
  conflict?: ConflictItem;
  override?: OverrideDecision;
  context?: ValidationContext;
  metadata?: Record<string, unknown>;
}

export type ConflictEventHandler = (event: ConflictEventPayload) => void;

@Injectable({ providedIn: 'root' })
export class ConflictEventSystem {
  private handlers = new Map<ConflictEventType, Set<ConflictEventHandler>>();
  private allHandlers = new Set<ConflictEventHandler>();

  on(type: ConflictEventType, handler: ConflictEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  onAny(handler: ConflictEventHandler): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  emit(type: ConflictEventType, payload: Partial<ConflictEventPayload>): void {
    const event: ConflictEventPayload = {
      type,
      timestamp: Date.now(),
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
