import { Injectable, inject } from '@angular/core';
import type { QueueEntry, CheckInRequest, CheckInResult, CheckInType } from './calendar-queue.models';
import { QueueCacheService, QueueLookupIndexService } from './calendar-queue-cache.service';
import { QueuePriorityService } from './calendar-queue-priority.service';
import { QueueEventSystem } from './calendar-queue-event-system';

@Injectable({ providedIn: 'root' })
export class CheckInEngineService {
  private cache = inject(QueueCacheService);
  private lookupIndex = inject(QueueLookupIndexService);
  private priorityService = inject(QueuePriorityService);
  private events = inject(QueueEventSystem);

  private tokenCounter = 0;
  private queueNumberCounter = 0;

  checkIn(request: CheckInRequest): CheckInResult {
    const now = new Date();
    const allEntries = this.cache.allEntries;

    const { level, score, reason } = this.priorityService.calculatePriority(request, allEntries);

    let checkInType: CheckInType = 'manual';
    let isEarly = false;
    let isLate = false;

    if (request.appointmentTime) {
      const apptTime = new Date(request.appointmentTime).getTime();
      const diffMin = (apptTime - now.getTime()) / 60000;
      if (diffMin < -15) { checkInType = 'late'; isLate = true; }
      else if (diffMin > 15) { checkInType = 'early'; isEarly = true; }
    } else {
      checkInType = 'walk_in';
    }

    this.tokenCounter++;
    this.queueNumberCounter++;

    const estimatedServiceMinutes = request.services.reduce((sum, s) => sum + s.durationMin, 30);
    const waitingCount = allEntries.filter(e => e.status === 'WAITING' || e.status === 'CHECKED_IN').length;
    const estimatedWaitMinutes = this.estimateWaitTime(allEntries, level, waitingCount);

    const entry: QueueEntry = {
      id: crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      token: this.generateToken(now),
      queueNumber: this.queueNumberCounter,
      status: 'WAITING',
      clientId: request.clientId,
      clientName: request.clientName,
      clientPhone: request.clientPhone,
      isVIP: request.isVIP || false,
      membershipTier: request.membershipTier,
      staffId: request.staffId,
      staffName: request.staffName,
      services: request.services,
      appointmentId: request.appointmentId,
      appointmentTime: request.appointmentTime,
      checkInTime: now.toISOString(),
      checkInType,
      priority: level,
      priorityScore: score,
      priorityReason: reason,
      position: this.calculatePosition(score, now.toISOString(), allEntries),
      estimatedWaitMinutes,
      estimatedServiceMinutes,
      waitingMinutes: 0,
      notes: request.notes,
      createdBy: request.createdBy,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.cache.setEntry(entry);
    this.lookupIndex.indexEntry(entry);

    this.events.emit('queue:joined', { entry, checkInResult: result });
    this.events.emit('queue:checked_in', { entry });

    return { entry, checkInType, isEarly, isLate, waitTimeMinutes: estimatedWaitMinutes };
  }

  walkInCheckIn(clientName: string, services: { name: string; durationMin: number; price: number }[], createdBy: string, staffId?: string): CheckInResult {
    return this.checkIn({ clientName, services, createdBy, staffId, appointmentId: undefined });
  }

  private generateToken(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const seq = this.tokenCounter.toString().padStart(4, '0');
    return `Q${day}${month}-${seq}`;
  }

  private estimateWaitTime(allEntries: QueueEntry[], priority: string, waitingCount: number): number {
    if (waitingCount === 0) return 0;
    const baseWait = waitingCount * 15;
    const priorityMultiplier = priority === 'URGENT' ? 0.3 : priority === 'HIGH' ? 0.6 : priority === 'NORMAL' ? 1 : 1.5;
    return Math.round(baseWait * priorityMultiplier);
  }

  private calculatePosition(score: number, checkInTime: string, allEntries: QueueEntry[]): number {
    const active = allEntries
      .filter(e => e.status === 'WAITING' || e.status === 'CHECKED_IN')
      .sort((a, b) => {
        if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      });

    let position = 1;
    for (const e of active) {
      if (e.priorityScore > score) position++;
      else if (e.priorityScore === score && new Date(e.checkInTime).getTime() < new Date(checkInTime).getTime()) position++;
    }
    return position;
  }
}
