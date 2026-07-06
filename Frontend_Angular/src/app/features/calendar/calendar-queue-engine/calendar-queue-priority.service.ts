import { Injectable } from '@angular/core';
import type { QueueEntry, PriorityLevel, CheckInRequest } from './calendar-queue.models';

export interface PriorityFactor {
  name: string;
  score: number;
  reason: string;
}

@Injectable({ providedIn: 'root' })
export class QueuePriorityService {
  private manualOverrides = new Map<string, PriorityLevel>();

  setManualOverride(entryId: string, level: PriorityLevel): void {
    this.manualOverrides.set(entryId, level);
  }

  clearManualOverride(entryId: string): void {
    this.manualOverrides.delete(entryId);
  }

  calculatePriority(request: CheckInRequest, existingEntries: QueueEntry[]): { level: PriorityLevel; score: number; factors: PriorityFactor[]; reason?: string } {
    const factors: PriorityFactor[] = [];
    let score = 0;

    if (request.isVIP) {
      factors.push({ name: 'VIP', score: 50, reason: 'VIP client priority' });
      score += 50;
    }

    if (request.membershipTier) {
      const membershipScores: Record<string, number> = {
        PLATINUM: 40, GOLD: 30, SILVER: 20, DIAMOND: 35,
      };
      const ms = membershipScores[request.membershipTier] || 10;
      factors.push({ name: 'Membership', score: ms, reason: `${request.membershipTier} membership tier` });
      score += ms;
    }

    if (request.appointmentTime) {
      const apptTime = new Date(request.appointmentTime).getTime();
      const now = Date.now();
      const diffMs = apptTime - now;
      const diffMin = diffMs / 60000;

      if (diffMin < 0) {
        factors.push({ name: 'Late', score: 15, reason: `Late arrival by ${Math.abs(Math.round(diffMin))}min` });
        score += 15;
      } else if (diffMin <= 15) {
        factors.push({ name: 'OnTime', score: 10, reason: 'Appointment within 15min' });
        score += 10;
      } else {
        factors.push({ name: 'Early', score: 5, reason: `Early arrival ${Math.round(diffMin)}min before` });
        score += 5;
      }
    }

    const walkIn = !request.appointmentId;
    if (walkIn) {
      factors.push({ name: 'WalkIn', score: 0, reason: 'Walk-in (base priority)' });
    }

    const waitingCount = existingEntries.filter(e => e.status === 'WAITING' || e.status === 'CHECKED_IN').length;
    if (waitingCount > 5) {
      factors.push({ name: 'QueueLength', score: 2, reason: `Queue has ${waitingCount} waiting` });
      score += 2;
    }

    const { level, reason } = this.scoreToLevel(score, factors);
    return { level, score, factors, reason };
  }

  recalculatePosition(entry: QueueEntry, allEntries: QueueEntry[]): number {
    const active = allEntries
      .filter(e => (e.status === 'WAITING' || e.status === 'CHECKED_IN') && e.id !== entry.id)
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      });

    let position = 1;
    for (const e of active) {
      if (e.priorityScore > entry.priorityScore) position++;
      else if (e.priorityScore === entry.priorityScore && new Date(e.checkInTime).getTime() < new Date(entry.checkInTime).getTime()) {
        position++;
      }
    }

    return position;
  }

  private scoreToLevel(score: number, factors: PriorityFactor[]): { level: PriorityLevel; reason?: string } {
    if (score >= 50) return { level: 'URGENT', reason: factors.map(f => f.reason).join('; ') };
    if (score >= 30) return { level: 'HIGH', reason: factors.map(f => f.reason).join('; ') };
    if (score >= 10) return { level: 'NORMAL', reason: undefined };
    return { level: 'LOW', reason: undefined };
  }
}
