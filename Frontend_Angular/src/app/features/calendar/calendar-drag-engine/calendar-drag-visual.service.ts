import { Injectable } from '@angular/core';

export interface GhostState {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  color: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isResize: boolean;
  resizeEdge: 'top' | 'bottom' | null;
}

export interface DropHighlightState {
  staffId: string;
  hour: number;
  valid: boolean;
}

@Injectable({ providedIn: 'root' })
export class DragVisualService {
  private ghostListeners: Array<(state: GhostState) => void> = [];
  private highlightListeners: Array<(state: DropHighlightState | null) => void> = [];
  private validTargetListeners: Array<(staffIds: string[]) => void> = [];

  ghost: GhostState = {
    visible: false, x: 0, y: 0, width: 0, height: 0,
    title: '', color: '', startTime: '', endTime: '',
    durationMinutes: 0, isResize: false, resizeEdge: null,
  };

  highlight: DropHighlightState | null = null;
  validTargets: string[] = [];

  showGhost(state: Partial<GhostState>): void {
    this.ghost = { ...this.ghost, ...state, visible: true };
    for (const fn of this.ghostListeners) fn(this.ghost);
  }

  hideGhost(): void {
    this.ghost.visible = false;
    for (const fn of this.ghostListeners) fn(this.ghost);
  }

  updateGhostPosition(x: number, y: number): void {
    this.ghost.x = x;
    this.ghost.y = y;
    for (const fn of this.ghostListeners) fn(this.ghost);
  }

  showHighlight(state: DropHighlightState): void {
    this.highlight = state;
    for (const fn of this.highlightListeners) fn(state);
  }

  hideHighlight(): void {
    this.highlight = null;
    for (const fn of this.highlightListeners) fn(null);
  }

  setValidTargets(staffIds: string[]): void {
    this.validTargets = staffIds;
    for (const fn of this.validTargetListeners) fn(staffIds);
  }

  onGhostChange(fn: (state: GhostState) => void): () => void {
    this.ghostListeners.push(fn);
    return () => { this.ghostListeners = this.ghostListeners.filter(l => l !== fn); };
  }

  onHighlightChange(fn: (state: DropHighlightState | null) => void): () => void {
    this.highlightListeners.push(fn);
    return () => { this.highlightListeners = this.highlightListeners.filter(l => l !== fn); };
  }

  onValidTargetsChange(fn: (staffIds: string[]) => void): () => void {
    this.validTargetListeners.push(fn);
    return () => { this.validTargetListeners = this.validTargetListeners.filter(l => l !== fn); };
  }

  clearAll(): void {
    this.hideGhost();
    this.hideHighlight();
    this.validTargets = [];
    this.ghostListeners = [];
    this.highlightListeners = [];
    this.validTargetListeners = [];
  }
}
