import { Injectable } from '@angular/core';
import type { ConflictItem, ConflictReport, ConflictSeverity } from './calendar-conflict.models';

export interface ConflictVisualState {
  appointmentId: string;
  hasConflict: boolean;
  severity: ConflictSeverity;
  borderColor: string;
  badgeText: string;
  badgeColor: string;
  tooltip: string;
  warningIcon: boolean;
  highlighted: boolean;
  denied: boolean;
  deniedAnimation: boolean;
  conflicts: ConflictItem[];
}

const SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  error: '#dc2626',
  warning: '#f59e0b',
  info: '#3b82f6',
};

const SEVERITY_BG_COLORS: Record<ConflictSeverity, string> = {
  error: '#fef2f2',
  warning: '#fefce8',
  info: '#eff6ff',
};

@Injectable({ providedIn: 'root' })
export class ConflictVisualService {
  private conflictStates = new Map<string, ConflictVisualState>();
  private listeners: Array<() => void> = [];
  private dropDenied = false;
  private deniedTimeout: ReturnType<typeof setTimeout> | null = null;

  getState(appointmentId: string): ConflictVisualState | undefined {
    return this.conflictStates.get(appointmentId);
  }

  getAllStates(): ConflictVisualState[] {
    return Array.from(this.conflictStates.values());
  }

  get isDropDenied(): boolean {
    return this.dropDenied;
  }

  applyReport(appointmentId: string, report: ConflictReport): void {
    if (report.valid) {
      this.clearAppointment(appointmentId);
      return;
    }

    const topConflict = report.errors[0] || report.warnings[0] || report.infos[0];
    if (!topConflict) {
      this.clearAppointment(appointmentId);
      return;
    }

    const severity = topConflict.severity;
    this.conflictStates.set(appointmentId, {
      appointmentId,
      hasConflict: true,
      severity,
      borderColor: SEVERITY_COLORS[severity],
      badgeText: this.getBadgeText(topConflict),
      badgeColor: SEVERITY_BG_COLORS[severity],
      tooltip: this.buildTooltip(report),
      warningIcon: severity === 'warning' || severity === 'error',
      highlighted: severity === 'error',
      denied: !report.valid,
      deniedAnimation: false,
      conflicts: report.conflicts,
    });

    this.notify();
  }

  clearAppointment(appointmentId: string): void {
    this.conflictStates.delete(appointmentId);
    this.notify();
  }

  clearAll(): void {
    this.conflictStates.clear();
    this.dropDenied = false;
    if (this.deniedTimeout) {
      clearTimeout(this.deniedTimeout);
      this.deniedTimeout = null;
    }
    this.notify();
  }

  triggerDropDenied(): void {
    this.dropDenied = true;
    for (const [, state] of this.conflictStates) {
      state.deniedAnimation = true;
      state.denied = true;
    }
    this.notify();

    if (this.deniedTimeout) clearTimeout(this.deniedTimeout);
    this.deniedTimeout = setTimeout(() => {
      this.dropDenied = false;
      for (const [, state] of this.conflictStates) {
        state.deniedAnimation = false;
        state.denied = false;
      }
      this.notify();
    }, 800);
  }

  hasConflict(appointmentId: string): boolean {
    return this.conflictStates.get(appointmentId)?.hasConflict || false;
  }

  getBorderColor(appointmentId: string): string | null {
    return this.conflictStates.get(appointmentId)?.borderColor || null;
  }

  getTooltip(appointmentId: string): string | null {
    return this.conflictStates.get(appointmentId)?.tooltip || null;
  }

  onChange(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private buildTooltip(report: ConflictReport): string {
    const parts: string[] = [];
    if (report.errors.length > 0) {
      parts.push('Errors:');
      parts.push(...report.errors.map(e => `  • ${e.message}`));
    }
    if (report.warnings.length > 0) {
      parts.push('Warnings:');
      parts.push(...report.warnings.map(w => `  • ${w.message}`));
    }
    if (report.infos.length > 0) {
      parts.push('Info:');
      parts.push(...report.infos.map(i => `  • ${i.message}`));
    }
    return parts.join('\n');
  }

  private getBadgeText(conflict: ConflictItem): string {
    if (conflict.category === 'staff') return 'Staff Conflict';
    if (conflict.category === 'client') return 'Client Conflict';
    if (conflict.category === 'resource') return 'Resource Conflict';
    if (conflict.category === 'buffer') return 'Buffer';
    return 'Conflict';
  }

  private notify(): void {
    for (const fn of this.listeners) {
      fn();
    }
  }
}
