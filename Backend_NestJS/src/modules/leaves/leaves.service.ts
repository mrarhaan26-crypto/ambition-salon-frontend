import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto, ApproveLeaveDto, RejectLeaveDto } from './dto/update-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLeaveDto, userId?: string) {
    const staff = await this.prisma.user.findUnique({ where: { id: dto.staffId } });
    if (!staff) throw new NotFoundException('Staff member not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException('End date must be after start date');

    // Conflict detection: check overlapping approved leaves
    const overlap = await this.prisma.staffLeave.findFirst({
      where: {
        staffId: dto.staffId,
        status: { in: ['PENDING', 'APPROVED'] },
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });
    if (overlap) {
      throw new BadRequestException(
        `Overlapping leave exists from ${overlap.startDate.toISOString().slice(0, 10)} to ${overlap.endDate.toISOString().slice(0, 10)}`,
      );
    }

    return this.prisma.staffLeave.create({
      data: {
        staffId: dto.staffId,
        leaveType: dto.leaveType as any,
        startDate: start,
        endDate: end,
        halfDay: dto.halfDay ?? false,
        reason: dto.reason,
        notes: dto.notes,
        attachmentUrl: dto.attachmentUrl,
        branchId: dto.branchId,
      },
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async findAll(query: QueryLeaveDto) {
    const where: any = {};
    if (query.staffId) where.staffId = query.staffId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.status) where.status = query.status;
    if (query.leaveType) where.leaveType = query.leaveType;

    if (query.from || query.to) {
      where.AND = [];
      if (query.from) where.AND.push({ endDate: { gte: new Date(query.from) } });
      if (query.to) where.AND.push({ startDate: { lte: new Date(query.to) } });
    } else if (query.startDate || query.endDate) {
      where.AND = [];
      if (query.startDate) where.AND.push({ endDate: { gte: new Date(query.startDate) } });
      if (query.endDate) where.AND.push({ startDate: { lte: new Date(query.endDate) } });
    }

    return this.prisma.staffLeave.findMany({
      where,
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const leave = await this.prisma.staffLeave.findUnique({
      where: { id },
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
    if (!leave) throw new NotFoundException('Leave not found');
    return leave;
  }

  async update(id: string, dto: UpdateLeaveDto) {
    await this.findOne(id);
    const data: any = {};
    if (dto.leaveType) data.leaveType = dto.leaveType;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.halfDay !== undefined) data.halfDay = dto.halfDay;
    if (dto.reason !== undefined) data.reason = dto.reason;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.attachmentUrl !== undefined) data.attachmentUrl = dto.attachmentUrl;

    return this.prisma.staffLeave.update({
      where: { id },
      data,
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async approve(id: string, dto: ApproveLeaveDto, approvedBy: string) {
    const leave = await this.findOne(id);
    if (leave.status !== 'PENDING') throw new BadRequestException('Only pending leaves can be approved');

    return this.prisma.staffLeave.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
        notes: dto.notes || leave.notes,
      },
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async reject(id: string, dto: RejectLeaveDto, rejectedBy: string) {
    const leave = await this.findOne(id);
    if (leave.status !== 'PENDING') throw new BadRequestException('Only pending leaves can be rejected');

    return this.prisma.staffLeave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: new Date(),
        rejectReason: dto.rejectReason,
        notes: dto.notes || leave.notes,
      },
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async cancel(id: string, userId: string) {
    const leave = await this.findOne(id);
    if (leave.status === 'CANCELLED') throw new BadRequestException('Leave already cancelled');
    if (leave.status === 'REJECTED') throw new BadRequestException('Cannot cancel a rejected leave');
    if (leave.staffId !== userId) throw new BadRequestException('You can only cancel your own leaves');

    return this.prisma.staffLeave.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
    });
  }

  async getStats(staffId: string) {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    const leaves = await this.prisma.staffLeave.findMany({
      where: {
        staffId,
        startDate: { gte: startOfYear },
        endDate: { lte: endOfYear },
        status: { not: 'CANCELLED' },
      },
    });

    const total = leaves.length;
    const approved = leaves.filter(l => l.status === 'APPROVED').length;
    const pending = leaves.filter(l => l.status === 'PENDING').length;
    const rejected = leaves.filter(l => l.status === 'REJECTED').length;

    const byType: Record<string, number> = {};
    leaves.filter(l => l.status === 'APPROVED').forEach(l => {
      byType[l.leaveType] = (byType[l.leaveType] || 0) + 1;
    });

    return { total, approved, pending, rejected, byType };
  }

  async getTodayLeaves(branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: any = {
      status: 'APPROVED',
      startDate: { lte: tomorrow },
      endDate: { gte: today },
    };
    if (branchId) where.branchId = branchId;

    return this.prisma.staffLeave.findMany({
      where,
      include: { staff: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { startDate: 'asc' },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.staffLeave.delete({ where: { id } });
  }
}
