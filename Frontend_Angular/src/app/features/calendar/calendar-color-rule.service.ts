import { Injectable, computed, inject } from '@angular/core';
import { CalendarStateService, ColorMode } from './calendar-state.service';
import { STATUS_COLORS, STAFF_COLORS } from './calendar.constants';
import type { CalendarBooking } from './calendar.models';

export interface ColorRuleLegendItem {
  key: string;
  label: string;
  color: string;
}

@Injectable({ providedIn: 'root' })
export class CalendarColorRuleService {
  private state = inject(CalendarStateService);

  readonly colorMode = computed(() => this.state.colorMode());

  readonly legend = computed<ColorRuleLegendItem[]>(() => {
    const mode = this.colorMode();
    switch (mode) {
      case 'status':
        return Object.entries(STATUS_COLORS).map(([status, color]) => ({
          key: status,
          label: status.charAt(0) + status.slice(1).toLowerCase(),
          color,
        }));
      case 'staff':
        return this.state.staffList().map((s, i) => ({
          key: s.id,
          label: s.name,
          color: STAFF_COLORS[i % STAFF_COLORS.length],
        }));
      case 'service':
        return [];
      case 'resource':
        return this.state.resources().map(r => ({
          key: r.id,
          label: r.name,
          color: this.getResourceColor(r.type),
        }));
      case 'source':
        return [
          { key: 'online', label: 'Online', color: '#4A90D9' },
          { key: 'walk-in', label: 'Walk-in', color: '#FFB74D' },
          { key: 'phone', label: 'Phone', color: '#50C878' },
          { key: 'rebook', label: 'Rebook', color: '#9575CD' },
        ];
      case 'payment':
        return [
          { key: 'PAID', label: 'Paid', color: '#2E7D32' },
          { key: 'PENDING', label: 'Pending', color: '#FFB74D' },
          { key: 'PARTIAL', label: 'Partial', color: '#4A90D9' },
          { key: 'REFUNDED', label: 'Refunded', color: '#E57373' },
        ];
      case 'vip':
        return [
          { key: 'vip', label: 'VIP', color: '#FFD700' },
          { key: 'regular', label: 'Regular', color: '#B0BEC5' },
        ];
      case 'conflict':
        return [
          { key: 'conflict', label: 'Conflict', color: '#dc2626' },
          { key: 'warning', label: 'Warning', color: '#f59e0b' },
          { key: 'clear', label: 'Clear', color: '#16a34a' },
        ];
      case 'branch':
        return [];
      default:
        return [];
    }
  });

  getColorForBooking(booking: CalendarBooking, staffColorMap: Record<string, string>): string {
    const mode = this.colorMode();
    switch (mode) {
      case 'status':
        return STATUS_COLORS[booking.status] || STATUS_COLORS['CONFIRMED'];
      case 'staff':
        return staffColorMap[booking.staffId || booking.staff?.id || ''] || '#999';
      case 'service': {
        const svc = (booking.services ?? [])[0];
        if (svc?.serviceId) return this.hashColor(svc.serviceId);
        return this.hashColor(svc?.name || booking.title);
      }
      case 'resource':
        return this.getResourceColor(booking.resource?.type || '');
      case 'source':
        return this.getSourceColor((booking as any).source);
      case 'payment':
        return this.getPaymentColor((booking as any).paymentStatus);
      case 'vip':
        return (booking.totalAmount ?? 0) >= 200 ? '#FFD700' : '#B0BEC5';
      case 'conflict':
        return '#B0BEC5';
      case 'branch':
        return this.hashColor(booking.branchId || booking.branch?.id || '');
      default:
        return STATUS_COLORS[booking.status] || STATUS_COLORS['CONFIRMED'];
    }
  }

  getCardBorderColor(booking: CalendarBooking, staffColorMap: Record<string, string>, hasConflict: boolean): string {
    if (hasConflict) return '#dc2626';
    return this.getColorForBooking(booking, staffColorMap);
  }

  private getResourceColor(type: string): string {
    const map: Record<string, string> = {
      chair: '#4A90D9',
      room: '#50C878',
      cabin: '#9575CD',
      equipment: '#FFB74D',
      machine: '#E57373',
      mirror: '#26A69A',
      locker: '#F06292',
    };
    return map[type?.toLowerCase()] || '#999';
  }

  private getSourceColor(source?: string): string {
    const map: Record<string, string> = {
      online: '#4A90D9',
      'walk-in': '#FFB74D',
      phone: '#50C878',
      rebook: '#9575CD',
    };
    return map[source?.toLowerCase() || ''] || '#B0BEC5';
  }

  private getPaymentColor(paymentStatus?: string): string {
    const map: Record<string, string> = {
      PAID: '#2E7D32',
      PENDING: '#FFB74D',
      PARTIAL: '#4A90D9',
      REFUNDED: '#E57373',
    };
    return map[paymentStatus || ''] || '#B0BEC5';
  }

  private hashColor(input: string): string {
    const colors = ['#4A90D9','#50C878','#E57373','#FFB74D','#9575CD','#26A69A','#F06292','#A1887F','#4DB6AC','#7986CB'];
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = input.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }
}
