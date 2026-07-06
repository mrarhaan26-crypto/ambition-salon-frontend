import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: any) {
    return this.prisma.resource.findMany({
      where: {
        ...(query.branchId ? { branchId: query.branchId } : {}),
        ...(query.type ? { type: query.type } : {}),
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
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
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
        ...(body.branchId !== undefined ? { branchId: body.branchId } : {}),
      },
    });
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
        resource: { select: { id: true, name: true, type: true } },
        client: { select: { id: true, fullName: true } },
        staff: { select: { id: true, fullName: true } },
        services: true,
      },
      orderBy: [{ resourceId: 'asc' }, { startTime: 'asc' }],
    });

    const byResource = new Map<string, typeof bookings>();
    for (const booking of bookings) {
      if (!booking.resourceId) continue;
      if (!byResource.has(booking.resourceId)) byResource.set(booking.resourceId, []);
      byResource.get(booking.resourceId)!.push(booking);
    }

    const conflicts: Array<any> = [];
    for (const [resourceId, resourceBookings] of byResource.entries()) {
      for (let i = 0; i < resourceBookings.length; i += 1) {
        for (let j = i + 1; j < resourceBookings.length; j += 1) {
          const first = resourceBookings[i];
          const second = resourceBookings[j];
          if (new Date(first.startTime) < new Date(second.endTime) && new Date(first.endTime) > new Date(second.startTime)) {
            conflicts.push({
              resourceId,
              resource: first.resource || second.resource || null,
              bookings: [first, second],
              conflictStart: new Date(Math.max(new Date(first.startTime).getTime(), new Date(second.startTime).getTime())).toISOString(),
              conflictEnd: new Date(Math.min(new Date(first.endTime).getTime(), new Date(second.endTime).getTime())).toISOString(),
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
}
