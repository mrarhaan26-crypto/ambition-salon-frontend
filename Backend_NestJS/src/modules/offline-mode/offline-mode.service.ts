import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class OfflineModeService {
  // OfflineQueue schema has no retryCount field; track retry attempts in-memory.
  private retryCounts: Map<string, number> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async queueAction(userId: string, deviceId: string, action: string, entityType: string, entityId?: string, payload?: any) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!deviceId) throw new BadRequestException('deviceId is required');
    if (!action) throw new BadRequestException('action is required');
    if (!entityType) throw new BadRequestException('entityType is required');

    const validActions = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE'];
    if (!validActions.includes(action.toUpperCase())) {
      throw new BadRequestException(`Invalid action. Must be one of: ${validActions.join(', ')}`);
    }

    const queuedAction = await this.prisma.offlineQueue.create({
      data: {
        userId,
        deviceId,
        action: action.toUpperCase(),
        entityType,
        entityId: entityId ?? null,
        payload: payload ?? undefined,
        status: 'QUEUED',
        createdAt: new Date(),
      },
    });

    return {
      id: queuedAction.id,
      userId,
      deviceId,
      action: action.toUpperCase(),
      entityType,
      entityId: entityId ?? null,
      status: 'QUEUED',
      createdAt: queuedAction.createdAt.toISOString(),
    };
  }

  async syncActions(userId: string, deviceId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!deviceId) throw new BadRequestException('deviceId is required');

    const actions = await this.prisma.offlineQueue.findMany({
      where: {
        userId,
        deviceId,
        status: { in: ['QUEUED', 'FAILED'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (actions.length === 0) {
      return {
        userId,
        deviceId,
        totalActions: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    let synced = 0;
    let failed = 0;
    const results: any[] = [];

    for (const action of actions) {
      try {
        await this.prisma.offlineQueue.update({
          where: { id: action.id },
          data: { status: 'SYNCING', syncedAt: new Date() },
        });

        await this.processAction(action);

        await this.prisma.offlineQueue.update({
          where: { id: action.id },
          data: { status: 'SYNCED' },
        });

        synced++;
        results.push({ id: action.id, status: 'SYNCED' });
      } catch (error: any) {
        const newRetryCount = (this.retryCounts.get(action.id) ?? 0) + 1;
        const newStatus = newRetryCount >= 3 ? 'FAILED' : 'QUEUED';

        await this.prisma.offlineQueue.update({
          where: { id: action.id },
          data: {
            status: newStatus,
            errorMessage: error?.message ?? 'Unknown error',
          },
        });
        this.retryCounts.set(action.id, newRetryCount);

        failed++;
        results.push({ id: action.id, status: newStatus, error: error?.message });
      }
    }

    return {
      userId,
      deviceId,
      totalActions: actions.length,
      synced,
      failed,
      results,
    };
  }

  async getQueuedActions(userId: string, deviceId: string) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!deviceId) throw new BadRequestException('deviceId is required');

    const actions = await this.prisma.offlineQueue.findMany({
      where: { userId, deviceId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      userId,
      deviceId,
      totalActions: actions.length,
      actions: actions.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        status: a.status,
        retryCount: this.retryCounts.get(a.id) ?? 0,
        errorMessage: a.errorMessage,
        createdAt: a.createdAt.toISOString(),
        syncedAt: a.syncedAt?.toISOString() ?? null,
      })),
    };
  }

  async retryFailed(actionId: string) {
    if (!actionId) throw new BadRequestException('actionId is required');

    const action = await this.prisma.offlineQueue.findUnique({ where: { id: actionId } });
    if (!action) throw new NotFoundException('Action not found');

    if (action.status !== 'FAILED') {
      throw new BadRequestException('Only failed actions can be retried');
    }

    try {
      await this.prisma.offlineQueue.update({
        where: { id: actionId },
        data: { status: 'SYNCING', syncedAt: new Date() },
      });

      await this.processAction(action);

      const newRetryCount = (this.retryCounts.get(actionId) ?? 0) + 1;
      this.retryCounts.set(actionId, newRetryCount);
      await this.prisma.offlineQueue.update({
        where: { id: actionId },
        data: { status: 'SYNCED' },
      });

      return {
        id: actionId,
        status: 'SYNCED',
        message: 'Action retried and synced successfully',
      };
    } catch (error: any) {
      const newRetryCount = (this.retryCounts.get(actionId) ?? 0) + 1;
      this.retryCounts.set(actionId, newRetryCount);

      await this.prisma.offlineQueue.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          errorMessage: error?.message ?? 'Retry failed',
        },
      });

      return {
        id: actionId,
        status: 'FAILED',
        retryCount: newRetryCount,
        error: error?.message,
      };
    }
  }

  private async processAction(action: any) {
    const { entityType, action: actionType, entityId, payload } = action;

    switch (entityType) {
      case 'BOOKING':
        await this.processBookingAction(actionType, entityId, payload);
        break;
      case 'CLIENT':
        await this.processClientAction(actionType, entityId, payload);
        break;
      case 'WALKIN':
        await this.processWalkInAction(actionType, entityId, payload);
        break;
      case 'INVOICE':
        await this.processInvoiceAction(actionType, entityId, payload);
        break;
      default:
        break;
    }
  }

  private async processBookingAction(action: string, entityId?: string, payload?: any) {
    if (action === 'CREATE' && payload) {
      await this.prisma.booking.create({
        data: {
          branchId: payload.branchId,
          clientId: payload.clientId,
          staffId: payload.staffId,
          title: payload.title || 'Offline Booking',
          status: payload.status || 'PENDING',
          startTime: new Date(payload.startTime),
          endTime: new Date(payload.endTime),
          totalAmount: payload.totalAmount || 0,
        },
      });
    } else if (action === 'UPDATE' && entityId && payload) {
      await this.prisma.booking.update({ where: { id: entityId }, data: payload });
    } else if (action === 'DELETE' && entityId) {
      await this.prisma.booking.delete({ where: { id: entityId } });
    }
  }

  private async processClientAction(action: string, entityId?: string, payload?: any) {
    if (action === 'CREATE' && payload) {
      await this.prisma.client.create({
        data: {
          fullName: payload.fullName,
          phone: payload.phone,
          email: payload.email,
        },
      });
    } else if (action === 'UPDATE' && entityId && payload) {
      await this.prisma.client.update({ where: { id: entityId }, data: payload });
    } else if (action === 'DELETE' && entityId) {
      await this.prisma.client.delete({ where: { id: entityId } });
    }
  }

  private async processWalkInAction(action: string, entityId?: string, payload?: any) {
    if (action === 'CREATE' && payload) {
      await this.prisma.walkIn.create({
        data: {
          branchId: payload.branchId,
          customerName: payload.customerName,
          phone: payload.phone,
          serviceName: payload.serviceName,
          status: 'WAITING',
          queueNumber: payload.queueNumber || 1,
        },
      });
    } else if (action === 'UPDATE' && entityId && payload) {
      await this.prisma.walkIn.update({ where: { id: entityId }, data: payload });
    } else if (action === 'DELETE' && entityId) {
      await this.prisma.walkIn.delete({ where: { id: entityId } });
    }
  }

  private async processInvoiceAction(action: string, entityId?: string, payload?: any) {
    if (action === 'CREATE' && payload) {
      await this.prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
          clientId: payload.clientId,
          total: payload.totalAmount || 0,
          status: payload.status || 'PENDING',
        },
      });
    } else if (action === 'UPDATE' && entityId && payload) {
      await this.prisma.invoice.update({ where: { id: entityId }, data: payload });
    } else if (action === 'DELETE' && entityId) {
      await this.prisma.invoice.delete({ where: { id: entityId } });
    }
  }
}
