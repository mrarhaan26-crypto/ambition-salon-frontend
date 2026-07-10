import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { CreateElementDto } from './dto/create-element.dto';

@Injectable()
export class ResourceMapService {
  constructor(private readonly prisma: PrismaService) {}

  async getFloorPlans(branchId: string) {
    return this.prisma.floorPlan.findMany({
      where: { branchId },
      include: { elements: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFloorPlan(id: string) {
    const plan = await this.prisma.floorPlan.findUnique({
      where: { id },
      include: { elements: true },
    });
    if (!plan) throw new NotFoundException('Floor plan not found');
    return plan;
  }

  async createFloorPlan(branchId: string, data: CreateFloorPlanDto) {
    return this.prisma.floorPlan.create({
      data: {
        branchId,
        name: data.name,
        width: data.width ?? 800,
        height: data.height ?? 600,
        backgroundImage: data.backgroundImage ?? null,
        isActive: data.isActive ?? true,
      },
      include: { elements: true },
    });
  }

  async updateFloorPlan(id: string, data: Partial<CreateFloorPlanDto>) {
    await this.getFloorPlan(id);
    return this.prisma.floorPlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.height !== undefined ? { height: data.height } : {}),
        ...(data.backgroundImage !== undefined ? { backgroundImage: data.backgroundImage } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { elements: true },
    });
  }

  async deleteFloorPlan(id: string) {
    await this.getFloorPlan(id);
    return this.prisma.floorPlan.delete({ where: { id } });
  }

  async addElement(floorPlanId: string, data: CreateElementDto) {
    const plan = await this.prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!plan) throw new NotFoundException('Floor plan not found');

    if (data.resourceId) {
      const resource = await this.prisma.resource.findUnique({ where: { id: data.resourceId } });
      if (!resource) throw new NotFoundException('Resource not found');
    }

    return this.prisma.floorPlanElement.create({
      data: {
        floorPlanId,
        resourceId: data.resourceId ?? null,
        type: data.type,
        label: data.label ?? null,
        x: data.x ?? 0,
        y: data.y ?? 0,
        width: data.width ?? 100,
        height: data.height ?? 100,
        rotation: data.rotation ?? 0,
        color: data.color ?? null,
        status: data.status ?? 'available',
      },
    });
  }

  async updateElement(id: string, data: Partial<CreateElementDto>) {
    const element = await this.prisma.floorPlanElement.findUnique({ where: { id } });
    if (!element) throw new NotFoundException('Element not found');

    if (data.resourceId) {
      const resource = await this.prisma.resource.findUnique({ where: { id: data.resourceId } });
      if (!resource) throw new NotFoundException('Resource not found');
    }

    return this.prisma.floorPlanElement.update({
      where: { id },
      data: {
        ...(data.resourceId !== undefined ? { resourceId: data.resourceId } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.x !== undefined ? { x: data.x } : {}),
        ...(data.y !== undefined ? { y: data.y } : {}),
        ...(data.width !== undefined ? { width: data.width } : {}),
        ...(data.height !== undefined ? { height: data.height } : {}),
        ...(data.rotation !== undefined ? { rotation: data.rotation } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async deleteElement(id: string) {
    const element = await this.prisma.floorPlanElement.findUnique({ where: { id } });
    if (!element) throw new NotFoundException('Element not found');
    return this.prisma.floorPlanElement.delete({ where: { id } });
  }

  async getElementsByFloorPlan(floorPlanId: string) {
    const plan = await this.prisma.floorPlan.findUnique({ where: { id: floorPlanId } });
    if (!plan) throw new NotFoundException('Floor plan not found');

    return this.prisma.floorPlanElement.findMany({
      where: { floorPlanId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateElementStatus(id: string, status: string) {
    const allowed = ['available', 'occupied', 'maintenance', 'reserved'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Invalid status. Allowed: ${allowed.join(', ')}`);
    }

    const element = await this.prisma.floorPlanElement.findUnique({ where: { id } });
    if (!element) throw new NotFoundException('Element not found');

    return this.prisma.floorPlanElement.update({
      where: { id },
      data: { status },
    });
  }
}
