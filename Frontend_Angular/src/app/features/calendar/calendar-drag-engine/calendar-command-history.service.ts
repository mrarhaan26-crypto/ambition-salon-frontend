import { Injectable } from '@angular/core';

export interface DragCommand {
  id: string;
  type: 'move' | 'resize' | 'staff-change';
  timestamp: number;
  appointmentId: string;
  previous: {
    staffId: string;
    startTime: string;
    endTime: string;
  };
  current: {
    staffId: string;
    startTime: string;
    endTime: string;
  };
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class CommandHistoryService {
  private undoStack: DragCommand[] = [];
  private redoStack: DragCommand[] = [];
  private maxHistory = 50;

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoCount(): number {
    return this.undoStack.length;
  }

  get redoCount(): number {
    return this.redoStack.length;
  }

  push(command: DragCommand): void {
    this.undoStack.push(command);
    this.redoStack = [];
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  undo(): DragCommand | null {
    if (this.undoStack.length === 0) return null;
    const cmd = this.undoStack.pop()!;
    this.redoStack.push(cmd);
    return cmd;
  }

  redo(): DragCommand | null {
    if (this.redoStack.length === 0) return null;
    const cmd = this.redoStack.pop()!;
    this.undoStack.push(cmd);
    return cmd;
  }

  peekUndo(): DragCommand | null {
    return this.undoStack[this.undoStack.length - 1] || null;
  }

  peekRedo(): DragCommand | null {
    return this.redoStack[this.redoStack.length - 1] || null;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  setMaxHistory(max: number): void {
    this.maxHistory = max;
    while (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }

  toSnapshot(): { undoStack: DragCommand[]; redoStack: DragCommand[] } {
    return {
      undoStack: [...this.undoStack],
      redoStack: [...this.redoStack],
    };
  }

  fromSnapshot(snapshot: { undoStack: DragCommand[]; redoStack: DragCommand[] }): void {
    this.undoStack = [...snapshot.undoStack];
    this.redoStack = [...snapshot.redoStack];
  }
}
