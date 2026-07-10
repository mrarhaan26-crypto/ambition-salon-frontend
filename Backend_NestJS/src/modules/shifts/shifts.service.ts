import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ShiftTemplateCreateDto } from './dto/create-shift.dto';
import { ShiftAssignmentCreateDto } from './dto/create-assignment.dto';
import { ShiftSwapDto } from './dto/swap-shift.dto';
import { ShiftQueryDto } from './dto/query-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ShiftTemplateCreateDto) {
    return this.prisma.shiftTemplate.create({
      data: {
        branchId: data.branchId,
        name: data.name,
        startTime: data.startTime,
        endTime: data.endTime,
        breakMin: data.breakMin ?? 0,
        color: data.color,
      },
    });
  }

  async findAll(branchId?: string, query?: ShiftQueryDto) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (query?.branchId) where.branchId = query.branchId;
    where.isActive = true;

    return this.prisma.shiftTemplate.findMany({
      where,
      include: { assignments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.shiftTemplate.findUnique({
      where: { id },
      include: { assignments: true },
    });
    if (!shift) throw new NotFoundException('Shift template not found');
    return shift;
  }

  async update(id: string, data: Partial<ShiftTemplateCreateDto>) {
    await this.findOne(id);
    return this.prisma.shiftTemplate.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.shiftTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getTemplates(branchId: string) {
    return this.prisma.shiftTemplate.findMany({
      where: { branchId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAssignments(branchId: string, date: string, staffId?: string) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      branchId,
      date: { gte: startOfDay, lte: endOfDay },
    };
    if (staffId) where.staffId = staffId;

    return this.prisma.shiftAssignment.findMany({
      where,
      include: { shift: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createAssignment(data: ShiftAssignmentCreateDto) {
    const shift = await this.prisma.shiftTemplate.findUnique({ where: { id: data.shiftId } });
    if (!shift) throw new NotFoundException('Shift template not found');

    const assignmentDate = new Date(data.date);
    const startOfDay = new Date(assignmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(assignmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await this.prisma.shiftAssignment.findFirst({
      where: {
        staffId: data.staffId,
        date: { gte: startOfDay, lte: endOfDay },
      },
    });
    if (existing) throw new BadRequestException('Staff member already has an assignment for this date');

    return this.prisma.shiftAssignment.create({
      data: {
        branchId: data.branchId,
        staffId: data.staffId,
        shiftId: data.shiftId,
        date: assignmentDate,
        notes: data.notes,
      },
      include: { shift: true },
    });
  }

  async swapShifts(data: ShiftSwapDto) {
    const requesterShift = await this.prisma.shiftAssignment.findUnique({ where: { id: data.requesterShiftId } });
    const targetShift = await this.prisma.shiftAssignment.findUnique({ where: { id: data.targetShiftId } });

    if (!requesterShift) throw new NotFoundException('Requester shift assignment not found');
    if (!targetShift) throw new NotFoundException('Target shift assignment not found');
    if (requesterShift.staffId !== data.requesterId) throw new BadRequestException('Requester shift does not belong to requester');
    if (targetShift.staffId !== data.targetId) throw new BadRequestException('Target shift does not belong to target');

    const pendingSwap = await this.prisma.shiftSwap.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { requesterShiftId: data.requesterShiftId },
          { targetShiftId: data.targetShiftId },
          { requesterShiftId: data.targetShiftId },
          { targetShiftId: data.requesterShiftId },
        ],
      },
    });
    if (pendingSwap) throw new BadRequestException('One of these shifts already has a pending swap request');

    return this.prisma.shiftSwap.create({
      data: {
        branchId: requesterShift.branchId,
        requesterId: data.requesterId,
        targetId: data.targetId,
        requesterShiftId: data.requesterShiftId,
        targetShiftId: data.targetShiftId,
        requesterDate: new Date(data.requesterDate),
        targetDate: new Date(data.targetDate),
        notes: data.notes,
      },
    });
  }

  async approveSwap(id: string, approvedBy: string) {
    const swap = await this.prisma.shiftSwap.findUnique({ where: { id } });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'PENDING') throw new BadRequestException('Swap request is not pending');

    await this.prisma.$transaction([
      this.prisma.shiftSwap.update({
        where: { id },
        data: { status: 'APPROVED', approvedBy },
      }),
      this.prisma.shiftAssignment.update({
        where: { id: swap.requesterShiftId },
        data: { staffId: swap.targetId, date: swap.targetDate },
      }),
      this.prisma.shiftAssignment.update({
        where: { id: swap.targetShiftId },
        data: { staffId: swap.requesterId, date: swap.requesterDate },
      }),
    ]);

    return this.prisma.shiftSwap.findUnique({ where: { id } });
  }

  async rejectSwap(id: string, notes?: string) {
    const swap = await this.prisma.shiftSwap.findUnique({ where: { id } });
    if (!swap) throw new NotFoundException('Swap request not found');
    if (swap.status !== 'PENDING') throw new BadRequestException('Swap request is not pending');

    return this.prisma.shiftSwap.update({
      where: { id },
      data: { status: 'REJECTED', notes },
    });
  }

  async getStats(branchId: string, startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const assignments = await this.prisma.shiftAssignment.findMany({
      where: {
        branchId,
        date: { gte: start, lte: end },
      },
      include: { shift: true },
    });

    const totalShifts = assignments.length;
    const scheduled = assignments.filter(a => a.status === 'SCHEDULED').length;
    const checkedIn = assignments.filter(a => a.status === 'CHECKED_IN').length;
    const completed = assignments.filter(a => a.status === 'COMPLETED').length;
    const absent = assignments.filter(a => a.status === 'ABSENT').length;

    const byStaff: Record<string, number> = {};
    assignments.forEach(a => {
      byStaff[a.staffId] = (byStaff[a.staffId] || 0) + 1;
    });

    const byShift: Record<string, number> = {};
    assignments.forEach(a => {
      const name = a.shift?.name ?? 'Unknown';
      byShift[name] = (byShift[name] || 0) + 1;
    });

    return { totalShifts, scheduled, checkedIn, completed, absent, byStaff, byShift };
  }
}
