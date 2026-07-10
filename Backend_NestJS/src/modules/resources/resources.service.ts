import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

export type ResourcePeriod = 'day' | 'week' | 'month';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.resource.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.isActive !== undefined ? { isActive: query.isActive === 'true' } : {}),
      },
      include: { branch: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.resource.findUnique({ where: { id }, include: { branch: { select: { id: true, name: true } } } });
    if (!r) throw new NotFoundException('Resource not found');
    return r;
  }

  async create(body: any) {
    return this.prisma.resource.create({
      data: {
        branchId: body.branchId,
        name: body.name,
        type: body.type,
        description: body.description || null,
        isActive: body.isActive !== undefined ? body.isActive : true,
        status: body.status || 'ACTIVE',
        color: body.color || null,
        capacity: body.capacity !== undefined ? Number(body.capacity) : 1,
        cleaningBufferMin: body.cleaningBufferMin !== undefined ? Number(body.cleaningBufferMin) : 0,
      },
    });
  }

  async update(id: string, body: any) {
    await this.findOne(id);
    return this.prisma.resource.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.capacity !== undefined ? { capacity: Number(body.capacity) } : {}),
        ...(body.cleaningBufferMin !== undefined ? { cleaningBufferMin: Number(body.cleaningBufferMin) } : {}),
        ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
      },
    });
  }

  async setStatus(id: string, status: string) {
    const allowed = ['ACTIVE', 'MAINTENANCE', 'BLOCKED'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid resource status');
    await this.findOne(id);
    return this.prisma.resource.update({ where: { id }, data: { status: status as any, isActive: status === 'ACTIVE' } });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.resource.delete({ where: { id } });
  }

  async getAvailability(query: any) {
    const baseDate = this.parseResourceDate(query?.date, 'availability');
    const { start, end } = this.getDayRange(baseDate);

    const [resources, bookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: {
          ...(query?.branchId ? { branchId: query.branchId } : {}),
          ...(query?.type ? { type: query.type } : {}),
          isActive: true,
          status: 'ACTIVE',
        },
        include: { branch: { select: { id: true, name: true } } },
        orderBy: [{ branchId: 'asc' }, { type: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.booking.findMany({
        where: {
          resourceId: { not: null },
          startTime: { gte: start, lt: end },
          status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
          ...(query?.branchId ? { branchId: query.branchId } : {}),
        },
        select: { id: true, resourceId: true, title: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const byResource = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.resourceId) continue;
      if (!byResource.has(booking.resourceId)) byResource.set(booking.resourceId, []);
      byResource.get(booking.resourceId)!.push(booking);
    }

    const totalDayMinutes = 1440;
    const resourceResults = resources.map((resource) => {
      const timeline = byResource.get(resource.id) || [];
      const occupiedMinutes = timeline.reduce((sum, booking) => {
        return sum + Math.max(0, Math.round((new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60000));
      }, 0);
      const availabilityStatus = timeline.length === 0 ? 'AVAILABLE' : occupiedMinutes >= totalDayMinutes ? 'OCCUPIED' : 'PARTIAL';

      return {
        ...resource,
        availabilityStatus,
        occupiedMinutes,
        availableMinutes: Math.max(0, totalDayMinutes - occupiedMinutes),
        utilizationPercent: Math.min(100, Math.round((occupiedMinutes / totalDayMinutes) * 100)),
        timeline,
      };
    });

    const occupiedResources = resourceResults.filter((resource) => resource.availabilityStatus !== 'AVAILABLE').length;

    return {
      date: start.toISOString().slice(0, 10),
      range: { start: start.toISOString(), end: end.toISOString() },
      filters: { branchId: query?.branchId ?? null, type: query?.type ?? null },
      totalResources: resources.length,
      availableResources: resources.length - occupiedResources,
      occupiedResources,
      resources: resourceResults,
    };
  }

  async getStatistics(query: any) {
    const where: any = {};
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.type) where.type = query.type;

    const [all, byType, byStatus] = await this.prisma.$transaction([
      this.prisma.resource.count({ where }),
      this.prisma.resource.groupBy({ by: ['type'], where, orderBy: { type: 'asc' }, _count: { _all: true } }),
      this.prisma.resource.groupBy({ by: ['status'], where, orderBy: { status: 'asc' }, _count: { _all: true } }),
    ]);

    const totalCapacity = (
      await this.prisma.resource.aggregate({ where, _sum: { capacity: true } })
    )._sum.capacity || 0;

    const countOf = (statusValue: string) => {
      const found = byStatus.find((g: any) => g.status === statusValue);
      return found ? (found._count as any)._all || 0 : 0;
    };
    const maintenance = countOf('MAINTENANCE');
    const blocked = countOf('BLOCKED');
    const active = countOf('ACTIVE');

    return {
      totalResources: all,
      totalCapacity,
      active,
      maintenance,
      blocked,
      byType: byType.map((g: any) => ({ type: g.type, count: (g._count as any)._all })),
      byStatus: byStatus.map((g: any) => ({ status: g.status, count: (g._count as any)._all })),
    };
  }

  async getUtilization(query: any) {
    const period: ResourcePeriod = ['day', 'week', 'month'].includes(query?.period) ? query.period : 'day';
    const baseDate = this.parseResourceDate(query?.date, 'utilization');
    const { start, end } = this.getPeriodRange(baseDate, period);

    const where: any = {
      resourceId: { not: null },
      startTime: { gte: start, lt: end },
      status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
    };
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.type) where.resource = { type: query.type };

    const [resources, bookings] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where: {
          ...(query?.branchId ? { branchId: query.branchId } : {}),
          ...(query?.type ? { type: query.type } : {}),
          isActive: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.booking.findMany({
        where,
        select: { id: true, resourceId: true, title: true, startTime: true, endTime: true },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const totalMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    const byResource = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.resourceId) continue;
      if (!byResource.has(booking.resourceId)) byResource.set(booking.resourceId, []);
      byResource.get(booking.resourceId)!.push(booking);
    }

    const perResource = resources.map((resource) => {
      const list = byResource.get(resource.id) || [];
      const occupiedMinutes = list.reduce((sum, b) => sum + Math.max(0, Math.round((new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60000)), 0);
      const capacity = resource.capacity || 1;
      const utilizationPercent = Math.min(100, Math.round((occupiedMinutes / (totalMinutes * capacity)) * 100));
      return {
        id: resource.id,
        name: resource.name,
        type: resource.type,
        status: resource.status,
        color: resource.color,
        capacity,
        bookingsCount: list.length,
        occupiedMinutes,
        availableMinutes: Math.max(0, totalMinutes * capacity - occupiedMinutes),
        utilizationPercent,
      };
    });

    const withUtil = perResource.filter((r) => r.bookingsCount > 0);
    const avg = withUtil.length ? Math.round(withUtil.reduce((s, r) => s + r.utilizationPercent, 0) / withUtil.length) : 0;
    const peak = perResource.reduce((m, r) => Math.max(m, r.utilizationPercent), 0);

    return {
      period,
      range: { start: start.toISOString(), end: end.toISOString() },
      totalMinutes,
      filters: { branchId: query?.branchId ?? null, type: query?.type ?? null },
      averageUtilization: avg,
      peakUtilization: peak,
      resources: perResource,
    };
  }

  async getTimeline(query: any) {
    const baseDate = this.parseResourceDate(query?.date, 'timeline');
    const { start, end } = this.getDayRange(baseDate);

    const where: any = {
      ...(query?.branchId ? { branchId: query.branchId } : {}),
      ...(query?.type ? { type: query.type } : {}),
    };

    const resources = await this.prisma.resource.findMany({
      where,
      include: { branch: { select: { id: true, name: true } } },
      orderBy: [{ branchId: 'asc' }, { type: 'asc' }, { name: 'asc' }],
    });

    const bookings = await this.prisma.booking.findMany({
      where: {
        resourceId: { in: resources.map((r) => r.id) },
        startTime: { gte: start, lt: end },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
      },
      select: { id: true, resourceId: true, title: true, clientId: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    });

    const byResource = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.resourceId) continue;
      if (!byResource.has(booking.resourceId)) byResource.set(booking.resourceId, []);
      byResource.get(booking.resourceId)!.push(booking);
    }

    const result = resources.map((resource) => {
      const list = byResource.get(resource.id) || [];
      const blocks: Array<any> = [];

      if (resource.status !== 'ACTIVE') {
        blocks.push({
          type: 'blocked',
          reason: resource.status === 'MAINTENANCE' ? 'Maintenance' : 'Blocked',
          start: start.toISOString(),
          end: end.toISOString(),
          resourceId: resource.id,
        });
      }

      const sorted = [...list].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      for (let i = 0; i < sorted.length; i += 1) {
        const b = sorted[i];
        const buffer = resource.cleaningBufferMin || 0;
        blocks.push({
          type: 'booking',
          id: b.id,
          title: b.title,
          clientId: b.clientId,
          start: b.startTime,
          end: b.endTime,
          resourceId: resource.id,
        });
        const bookingEnd = new Date(b.endTime).getTime();
        const nextStart = i + 1 < sorted.length ? new Date(sorted[i + 1].startTime).getTime() : end.getTime();
        if (buffer > 0 && bookingEnd + buffer <= nextStart) {
          blocks.push({
            type: 'cleaning',
            start: new Date(bookingEnd).toISOString(),
            end: new Date(bookingEnd + buffer * 60000).toISOString(),
            resourceId: resource.id,
          });
        }
      }

      return { ...resource, timeline: blocks };
    });

    return {
      date: start.toISOString().slice(0, 10),
      range: { start: start.toISOString(), end: end.toISOString() },
      filters: { branchId: query?.branchId ?? null, type: query?.type ?? null },
      resources: result,
    };
  }

  async autoAssign(body: any) {
    const bookingId = body.bookingId;
    if (!bookingId) throw new BadRequestException('bookingId is required');
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    const candidates = await this.prisma.resource.findMany({
      where: {
        branchId: booking.branchId,
        status: 'ACTIVE',
        isActive: true,
        capacity: { gte: 1 },
        ...(body.type ? { type: body.type } : {}),
      },
      orderBy: { name: 'asc' },
    });

    const occupied = await this.prisma.booking.findMany({
      where: {
        resourceId: { in: candidates.map((c) => c.id) },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      select: { resourceId: true, startTime: true, endTime: true },
    });

    const byResource = new Map<string, typeof occupied>();
    for (const o of occupied) {
      if (!o.resourceId) continue;
      if (!byResource.has(o.resourceId)) byResource.set(o.resourceId, []);
      byResource.get(o.resourceId)!.push(o);
    }

    for (const resource of candidates) {
      const list = byResource.get(resource.id) || [];
      const clash = list.some((o) => {
        const oBuffer = resource.cleaningBufferMin || 0;
        const oEnd = new Date(o.endTime).getTime() + oBuffer * 60000;
        const oStart = new Date(o.startTime).getTime() - oBuffer * 60000;
        return start.getTime() < oEnd && end.getTime() > oStart;
      });
      if (!clash) {
        await this.prisma.booking.update({ where: { id: bookingId }, data: { resourceId: resource.id } });
        return { assigned: true, resourceId: resource.id, resourceName: resource.name };
      }
    }

    return { assigned: false, resourceId: null, message: 'No free resource available for the selected window' };
  }

  async getConflicts(query: any) {
    const baseDate = this.parseResourceDate(query?.date, 'conflict');
    const { start, end } = this.getDayRange(baseDate);

    const bookings = await this.prisma.booking.findMany({
      where: {
        resourceId: { not: null },
        startTime: { gte: start, lt: end },
        status: { in: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] },
        ...(query?.branchId ? { branchId: query.branchId } : {}),
      },
      include: {
        resource: { select: { id: true, name: true, type: true, status: true, cleaningBufferMin: true } },
        client: { select: { id: true, fullName: true } },
        staff: { select: { id: true, fullName: true } },
        services: true,
      },
      orderBy: [{ resourceId: 'asc' }, { startTime: 'asc' }],
    });

    const byResource = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.resourceId) continue;
      if (booking.resource?.status && booking.resource.status !== 'ACTIVE') continue;
      if (!byResource.has(booking.resourceId)) byResource.set(booking.resourceId, []);
      byResource.get(booking.resourceId)!.push(booking);
    }

    const conflicts: Array<any> = [];
    for (const [resourceId, resourceBookings] of byResource.entries()) {
      for (let i = 0; i < resourceBookings.length; i += 1) {
        for (let j = i + 1; j < resourceBookings.length; j += 1) {
          const first = resourceBookings[i];
          const second = resourceBookings[j];
          const buffer = first.resource?.cleaningBufferMin || 0;
          const firstEnd = new Date(first.endTime).getTime() + buffer * 60000;
          const secondEnd = new Date(second.endTime).getTime() + buffer * 60000;
          if (new Date(first.startTime).getTime() < secondEnd && firstEnd > new Date(second.startTime).getTime()) {
            conflicts.push({
              resourceId,
              resource: first.resource || second.resource || null,
              bookings: [first, second],
              conflictStart: new Date(Math.max(new Date(first.startTime).getTime(), new Date(second.startTime).getTime())).toISOString(),
              conflictEnd: new Date(Math.min(firstEnd, secondEnd)).toISOString(),
              cleaningBufferMin: buffer,
            });
          }
        }
      }
    }

    return {
      date: start.toISOString().slice(0, 10),
      range: { start: start.toISOString(), end: end.toISOString() },
      filters: { branchId: query?.branchId ?? null },
      conflictCount: conflicts.length,
      conflicts,
    };
  }

  private parseResourceDate(value: string | undefined, label: string) {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`Invalid resource ${label} date`);
    }
    return date;
  }

  private getDayRange(baseDate: Date) {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { start, end };
  }

  private getPeriodRange(baseDate: Date, period: ResourcePeriod) {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (period === 'week') {
      const day = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - day);
      end.setDate(start.getDate() + 7);
    } else if (period === 'month') {
      start.setDate(1);
      end.setMonth(start.getMonth() + 1);
    } else {
      end.setDate(start.getDate() + 1);
    }
    return { start, end };
  }
}
