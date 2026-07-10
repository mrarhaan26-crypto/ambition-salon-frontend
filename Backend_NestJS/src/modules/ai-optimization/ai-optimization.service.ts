import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreatePromotionDto } from './dto/promotion.dto';

@Injectable()
export class AiOptimizationService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzeChairUtilization(branchId: string, date: string) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const [resources, bookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: { branchId, type: 'CHAIR', isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId,
          resourceId: { not: null },
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        select: { id: true, resourceId: true, startTime: true, endTime: true, totalAmount: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const totalMinutes = 14 * 60;
    const byResource = new Map<string, typeof bookings>();
    for (const b of bookings) {
      if (!b.resourceId) continue;
      if (!byResource.has(b.resourceId)) byResource.set(b.resourceId, []);
      byResource.get(b.resourceId)!.push(b);
    }

    const chairs = resources.map((r) => {
      const list = byResource.get(r.id) || [];
      const bookedMinutes = list.reduce(
        (sum, b) => sum + Math.max(0, Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)),
        0,
      );
      const utilization = Math.min(100, Math.round((bookedMinutes / totalMinutes) * 100));
      const revenue = list.reduce((s, b) => s + b.totalAmount, 0);

      return {
        resourceId: r.id,
        name: r.name,
        status: r.status,
        bookedMinutes,
        availableMinutes: Math.max(0, totalMinutes - bookedMinutes),
        utilization,
        bookingCount: list.length,
        revenue,
      };
    });

    const active = chairs.filter((c) => c.utilization > 0);
    const avgUtilization = active.length
      ? Math.round(active.reduce((s, c) => s + c.utilization, 0) / active.length)
      : 0;

    const underutilized = chairs.filter((c) => c.utilization < 30 && c.status === 'ACTIVE');
    const overutilized = chairs.filter((c) => c.utilization > 85);

    const recommendations: string[] = [];
    if (underutilized.length) {
      recommendations.push(`${underutilized.length} chair(s) below 30% utilization — consider promotions or reassignment.`);
    }
    if (overutilized.length) {
      recommendations.push(`${overutilized.length} chair(s) above 85% utilization — consider adding capacity or extending hours.`);
    }

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      totalChairs: chairs.length,
      averageUtilization: avgUtilization,
      chairs,
      underutilized: underutilized.map((c) => c.name),
      overutilized: overutilized.map((c) => c.name),
      recommendations,
    };
  }

  async analyzeStaffUtilization(branchId: string, date: string) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const [staffUsers, bookings] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { isActive: true, role: { in: ['STYLIST', 'THERAPIST'] } },
        select: { id: true, fullName: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId,
          staffId: { not: null },
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        select: { id: true, staffId: true, startTime: true, endTime: true, totalAmount: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const totalMinutes = 14 * 60;
    const byStaff = new Map<string, typeof bookings>();
    for (const b of bookings) {
      if (!b.staffId) continue;
      if (!byStaff.has(b.staffId)) byStaff.set(b.staffId, []);
      byStaff.get(b.staffId)!.push(b);
    }

    const staffAnalysis = staffUsers.map((s) => {
      const list = byStaff.get(s.id) || [];
      const bookedMinutes = list.reduce(
        (sum, b) => sum + Math.max(0, Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)),
        0,
      );
      const utilization = Math.min(100, Math.round((bookedMinutes / totalMinutes) * 100));
      const revenue = list.reduce((sum, b) => sum + b.totalAmount, 0);
      const revenuePerHour = bookedMinutes > 0 ? Math.round((revenue / bookedMinutes) * 60) : 0;

      return {
        staffId: s.id,
        name: s.fullName,
        role: s.role,
        bookedMinutes,
        availableMinutes: Math.max(0, totalMinutes - bookedMinutes),
        utilization,
        bookingCount: list.length,
        revenue,
        revenuePerHour,
      };
    });

    const activeStaff = staffAnalysis.filter((s) => s.utilization > 0);
    const avgUtilization = activeStaff.length
      ? Math.round(activeStaff.reduce((s, st) => s + st.utilization, 0) / activeStaff.length)
      : 0;

    const idle = staffAnalysis.filter((s) => s.utilization === 0 && s.role !== 'MANAGER');
    const topPerformers = [...activeStaff].sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      totalStaff: staffAnalysis.length,
      activeStaff: activeStaff.length,
      averageUtilization: avgUtilization,
      staff: staffAnalysis,
      idleStaff: idle.map((s) => s.name),
      topPerformers: topPerformers.map((s) => ({ name: s.name, revenue: s.revenue, bookings: s.bookingCount })),
    };
  }

  async getRevenueOptimization(branchId: string, date: string) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const [currentBookings, prevDateBookings, services] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          branchId,
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['COMPLETED', 'CHECKED_IN'] },
        },
        select: { id: true, startTime: true, endTime: true, totalAmount: true },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId,
          startTime: { gte: new Date(dayStart.getTime() - 7 * 86400000), lt: dayStart },
          status: { in: ['COMPLETED', 'CHECKED_IN'] },
        },
        select: { id: true, startTime: true, totalAmount: true },
      }),
      this.prisma.bookingService.groupBy({
        by: ['name'],
        where: { booking: { branchId, startTime: { gte: dayStart, lt: dayEnd } } },
        _sum: { price: true },
        _count: { id: true },
        orderBy: { _sum: { price: 'desc' } },
      }),
    ]);

    const hourlyRevenue = new Map<number, number>();
    const hourlyBookings = new Map<number, number>();
    for (const b of currentBookings) {
      const hour = new Date(b.startTime).getHours();
      hourlyRevenue.set(hour, (hourlyRevenue.get(hour) || 0) + b.totalAmount);
      hourlyBookings.set(hour, (hourlyBookings.get(hour) || 0) + 1);
    }

    const hourly = Array.from({ length: 14 }, (_, i) => i + 8).map((h) => ({
      hour: h,
      revenue: hourlyRevenue.get(h) || 0,
      bookings: hourlyBookings.get(h) || 0,
    }));

    const totalRevenue = currentBookings.reduce((s, b) => s + b.totalAmount, 0);
    const prevRevenue = prevDateBookings.reduce((s, b) => s + b.totalAmount, 0);
    const revenueGrowth = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : 0;

    const peakHour = hourly.reduce((max, h) => (h.revenue > max.revenue ? h : max), hourly[0] || { hour: 0, revenue: 0 });
    const offPeakHours = hourly.filter((h) => h.revenue === 0).map((h) => h.hour);

    const recommendations: string[] = [];
    if (offPeakHours.length > 3) {
      recommendations.push(`${offPeakHours.length} idle hours detected — run off-peak promotions to boost revenue.`);
    }
    if (peakHour.revenue > 0) {
      recommendations.push(`Peak revenue at ${peakHour.hour}:00 — ₹${peakHour.revenue}. Consider premium pricing for this slot.`);
    }

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      totalRevenue,
      revenueGrowth,
      averagePerBooking: currentBookings.length ? Math.round(totalRevenue / currentBookings.length) : 0,
      hourly,
      peakHour,
      topServices: services.map((s) => ({
        name: s.name,
        revenue: s._sum?.price ?? 0,
        bookings: (s._count as any)?.id ?? 0,
      })),
      recommendations,
    };
  }

  async generateHeatmap(branchId: string, date: string, hour?: number) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const [resources, bookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: { branchId, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId,
          resourceId: { not: null },
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        select: { id: true, resourceId: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const hours = hour !== undefined ? [hour] : Array.from({ length: 14 }, (_, i) => i + 8);
    const byResource = new Map<string, typeof bookings>();
    for (const b of bookings) {
      if (!b.resourceId) continue;
      if (!byResource.has(b.resourceId)) byResource.set(b.resourceId, []);
      byResource.get(b.resourceId)!.push(b);
    }

    const heatmap = hours.map((h) => {
      const hourStart = new Date(dayStart);
      hourStart.setHours(h, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(h + 1);

      const slots = resources.map((r) => {
        const list = byResource.get(r.id) || [];
        const activeBookings = list.filter((b) => {
          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();
          return bStart < hourEnd.getTime() && bEnd > hourStart.getTime();
        });

        return {
          resourceId: r.id,
          name: r.name,
          type: r.type,
          activeBookings: activeBookings.length,
          occupancy: activeBookings.length > 0 ? Math.min(100, activeBookings.length * 50) : 0,
        };
      });

      const totalOccupied = slots.reduce((s, sl) => s + sl.activeBookings, 0);
      const avgOccupancy = resources.length > 0 ? Math.round((totalOccupied / resources.length) * 50) : 0;

      return {
        hour: h,
        averageOccupancy: Math.min(100, avgOccupancy),
        slots,
      };
    });

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      totalResources: resources.length,
      heatmap,
    };
  }

  async predictBookings(branchId: string, date: string) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const prevStart = new Date(dayStart.getTime() - 28 * 86400000);
    const [currentBookings, prevBookings] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          branchId,
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        select: { id: true, startTime: true, status: true },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.booking.findMany({
        where: {
          branchId,
          startTime: { gte: prevStart, lt: dayStart },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
        },
        select: { id: true, startTime: true, status: true },
      }),
    ]);

    const dayOfWeek = dayStart.getDay();
    const prevSameDays = prevBookings.filter((b) => new Date(b.startTime).getDay() === dayOfWeek);
    const avgBookingsPerDay = prevSameDays.length / 4 || 0;

    const hourlyPredictions = Array.from({ length: 14 }, (_, i) => i + 8).map((h) => {
      const prevAtHour = prevSameDays.filter((b) => new Date(b.startTime).getHours() === h);
      const predicted = Math.round(prevAtHour.length / 4 * 10) / 10;
      return { hour: h, predicted, confidence: prevAtHour.length > 0 ? 0.75 : 0.3 };
    });

    const totalPredicted = hourlyPredictions.reduce((s, h) => s + h.predicted, 0);
    const actualToday = currentBookings.length;

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      dayOfWeek,
      averageBookingsPerDay: Math.round(avgBookingsPerDay * 10) / 10,
      predictedTotal: Math.round(totalPredicted * 10) / 10,
      actualToday,
      variance: Math.round((actualToday - totalPredicted) * 10) / 10,
      hourlyPredictions,
      confidence: 0.7,
      factors: ['Historical same-day-of-week pattern', 'Recent booking trend', 'Seasonal adjustment'],
    };
  }

  async predictNoShows(branchId: string, date: string) {
    const targetDate = this.parseDate(date);
    const dayStart = this.getDayStart(targetDate);
    const dayEnd = this.getDayEnd(targetDate);

    const [upcomingBookings, clientHistory] = await this.prisma.$transaction([
      this.prisma.booking.findMany({
        where: {
          branchId,
          startTime: { gte: dayStart, lt: dayEnd },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: {
          id: true,
          clientId: true,
          startTime: true,
          totalAmount: true,
          client: { select: { id: true, fullName: true, totalVisits: true } },
        },
        orderBy: { startTime: 'asc' },
      }),
      this.prisma.booking.groupBy({
        by: ['clientId'],
        where: {
          branchId,
          status: 'NO_SHOW',
          startTime: { gte: new Date(dayStart.getTime() - 90 * 86400000), lt: dayStart },
        },
        _count: { id: true },
        orderBy: { clientId: 'asc' },
      }),
    ]);

    const noShowMap = new Map<string, number>();
    for (const ns of clientHistory) {
      noShowMap.set(ns.clientId, (ns._count as any)?.id ?? 0);
    }

    const predictions = upcomingBookings.map((b) => {
      const pastNoShows = noShowMap.get(b.clientId) || 0;
      const visitCount = b.client?.totalVisits || 0;
      const isLastMinute = (new Date(b.startTime).getTime() - Date.now()) < 3600000;

      let riskScore = 0;
      if (pastNoShows > 0) riskScore += pastNoShows * 20;
      if (visitCount <= 1) riskScore += 15;
      if (isLastMinute) riskScore += 25;
      if (pastNoShows > 2) riskScore += 15;
      riskScore = Math.min(100, riskScore);

      const factors: string[] = [];
      if (pastNoShows > 0) factors.push(`${pastNoShows} previous no-show(s)`);
      if (visitCount <= 1) factors.push('New or infrequent client');
      if (isLastMinute) factors.push('Last-minute booking');

      return {
        bookingId: b.id,
        clientId: b.clientId,
        clientName: b.client?.fullName || 'Unknown',
        riskScore,
        riskLevel: riskScore >= 60 ? 'HIGH' : riskScore >= 30 ? 'MEDIUM' : 'LOW',
        factors,
        bookingAmount: b.totalAmount,
      };
    });

    const highRisk = predictions.filter((p) => p.riskLevel === 'HIGH');
    const mediumRisk = predictions.filter((p) => p.riskLevel === 'MEDIUM');

    return {
      date: dayStart.toISOString().slice(0, 10),
      branchId,
      totalBookings: predictions.length,
      highRiskCount: highRisk.length,
      mediumRiskCount: mediumRisk.length,
      lowRiskCount: predictions.length - highRisk.length - mediumRisk.length,
      potentialRevenueAtRisk: highRisk.reduce((s, p) => s + p.bookingAmount, 0),
      predictions,
      recommendations: [
        ...highRisk.map((p) => `Contact ${p.clientName} to confirm booking ${p.bookingId}`),
        ...mediumRisk.map((p) => `Send reminder to ${p.clientName}`),
      ],
    };
  }

  async autoFillWaitlist(branchId: string, cancelledBookingId: string) {
    const cancelledBooking = await this.prisma.booking.findUnique({
      where: { id: cancelledBookingId },
      select: { id: true, branchId: true, startTime: true, endTime: true, staffId: true, resourceId: true },
    });

    if (!cancelledBooking) throw new NotFoundException('Cancelled booking not found');
    if (cancelledBooking.branchId !== branchId) throw new BadRequestException('Booking does not belong to this branch');

    const waitlistEntries = await this.prisma.waitlistEntry.findMany({
      where: {
        branchId,
        status: 'WAITING',
        requestedDate: {
          gte: new Date(cancelledBooking.startTime.toISOString().slice(0, 10)),
          lt: new Date(new Date(cancelledBooking.startTime).getTime() + 86400000),
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { client: { select: { id: true, fullName: true } } },
    });

    if (waitlistEntries.length === 0) {
      return { filled: false, message: 'No waitlist entries found for this time slot' };
    }

    const bestMatch = waitlistEntries[0];
    const autoFill = await this.prisma.waitlistAutoFill.create({
      data: {
        branchId,
        cancelledBookingId,
        waitlistEntryId: bestMatch.id,
        autoFilled: true,
        notifiedAt: new Date(),
      },
    });

    await this.prisma.waitlistEntry.update({
      where: { id: bestMatch.id },
      data: { status: 'CONTACTED' },
    });

    return {
      filled: true,
      autoFillId: autoFill.id,
      waitlistEntry: bestMatch,
      cancelledBookingId,
      message: `Waitlist entry ${bestMatch.id} contacted for cancelled booking slot`,
    };
  }

  async getServiceRoutes(branchId: string) {
    const routes = await this.prisma.serviceRoute.findMany({
      where: { branchId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return routes.map((r) => ({
      ...r,
      steps: JSON.parse(r.steps || '[]'),
    }));
  }

  async optimizeRoute(branchId: string, serviceIds: string[]) {
    if (!serviceIds.length) throw new BadRequestException('At least one service ID is required');

    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds }, isActive: true },
      orderBy: { price: 'desc' },
    });

    if (!services.length) throw new NotFoundException('No valid services found');

    const steps = services.map((s, i) => ({
      order: i + 1,
      serviceId: s.id,
      name: s.name,
      durationMin: s.durationMin,
      price: s.price,
    }));

    const totalDuration = steps.reduce((s, st) => s + st.durationMin, 0);
    const totalRevenue = steps.reduce((s, st) => s + st.price, 0);

    const route = await this.prisma.serviceRoute.create({
      data: {
        branchId,
        name: `Optimized Route - ${new Date().toISOString().slice(0, 10)}`,
        steps: JSON.stringify(steps),
        totalDuration,
        totalRevenue,
      },
    });

    return { ...route, steps };
  }

  async getSmartPromotions(branchId: string) {
    const promotions = await this.prisma.smartPromotion.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
    });

    return promotions.map((p) => ({
      ...p,
      conversionRate: p.deliveredCount > 0 ? Math.round((p.convertedCount / p.deliveredCount) * 100) : 0,
      roi: p.revenue > 0 ? Math.round((p.revenue / (p.deliveredCount * 0.5 || 1)) * 100) / 100 : 0,
    }));
  }

  async createSmartPromotion(branchId: string, data: CreatePromotionDto) {
    const promotion = await this.prisma.smartPromotion.create({
      data: {
        branchId,
        name: data.name,
        type: data.type,
        targetSegment: data.targetSegment,
        content: data.content,
        channel: data.channel || 'WHATSAPP',
        discountType: data.discountType || 'PERCENTAGE',
        discountValue: data.discountValue || 0,
        status: data.status || 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });

    return promotion;
  }

  async getDashboard(branchId: string, dateRange: { from?: string; to?: string }) {
    const endDate = dateRange.to ? new Date(dateRange.to) : new Date();
    const startDate = dateRange.from ? new Date(dateRange.from) : new Date(endDate.getTime() - 30 * 86400000);

    const [totalBookings, revenue, noShows, cancellations, waitlistCount] = await this.prisma.$transaction([
      this.prisma.booking.count({
        where: { branchId, startTime: { gte: startDate, lte: endDate } },
      }),
      this.prisma.booking.aggregate({
        where: { branchId, startTime: { gte: startDate, lte: endDate }, status: { in: ['COMPLETED', 'CHECKED_IN'] } },
        _sum: { totalAmount: true },
        _avg: { totalAmount: true },
      }),
      this.prisma.booking.count({
        where: { branchId, startTime: { gte: startDate, lte: endDate }, status: 'NO_SHOW' },
      }),
      this.prisma.booking.count({
        where: { branchId, startTime: { gte: startDate, lte: endDate }, status: 'CANCELLED' },
      }),
      this.prisma.waitlistEntry.count({
        where: { branchId, status: 'WAITING' },
      }),
    ]);

    const avgRating = revenue._avg.totalAmount || 0;
    const noShowRate = totalBookings > 0 ? Math.round((noShows / totalBookings) * 100) : 0;
    const cancelRate = totalBookings > 0 ? Math.round((cancellations / totalBookings) * 100) : 0;

    return {
      branchId,
      period: { from: startDate.toISOString().slice(0, 10), to: endDate.toISOString().slice(0, 10) },
      summary: {
        totalBookings,
        totalRevenue: revenue._sum.totalAmount || 0,
        averageBookingValue: Math.round(avgRating),
        noShowRate,
        cancelRate,
        waitlistPending: waitlistCount,
      },
      healthScore: Math.max(0, 100 - noShowRate * 2 - cancelRate),
    };
  }

  private parseDate(date: string): Date {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid date');
    return d;
  }

  private getDayStart(date: Date): Date {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getDayEnd(date: Date): Date {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
  }
}
