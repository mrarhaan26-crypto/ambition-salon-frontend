import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class RealTimeService {
  private activeSessions: Map<string, any> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async connect(userId: string, sessionId: string, branchId?: string, deviceInfo?: any) {
    if (!userId) throw new BadRequestException('userId is required');
    if (!sessionId) throw new BadRequestException('sessionId is required');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true } });
    if (!user) throw new NotFoundException('User not found');

    if (branchId) {
      const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
      if (!branch) throw new NotFoundException('Branch not found');
    }

    const session = {
      userId,
      sessionId,
      branchId: branchId ?? null,
      deviceInfo: deviceInfo ?? null,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);

    // TODO: RealTimeSession model does not exist in the Prisma schema yet.
    // Persist to database once the model is added. In-memory fallback used for now.
    // await this.prisma.realTimeSession.upsert({ ... });

    return {
      sessionId,
      userId,
      branchId: session.branchId,
      connectedAt: session.connectedAt.toISOString(),
      status: 'CONNECTED',
    };
  }

  async disconnect(sessionId: string) {
    if (!sessionId) throw new BadRequestException('sessionId is required');

    const session = this.activeSessions.get(sessionId);
    this.activeSessions.delete(sessionId);

    // TODO: RealTimeSession model does not exist in the Prisma schema yet.
    // await this.prisma.realTimeSession.updateMany({ where: { sessionId }, data: { isActive: false, disconnectedAt: new Date() } });

    return {
      sessionId,
      status: 'DISCONNECTED',
      wasActive: !!session,
    };
  }

  async heartbeat(sessionId: string) {
    if (!sessionId) throw new BadRequestException('sessionId is required');

    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastHeartbeat = new Date();
    }

    // TODO: RealTimeSession model does not exist in the Prisma schema yet.
    // await this.prisma.realTimeSession.updateMany({ where: { sessionId, isActive: true }, data: { lastHeartbeat: new Date() } });

    return {
      sessionId,
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }

  async broadcastEvent(branchId: string, eventType: string, payload: any) {
    if (!branchId) throw new BadRequestException('branchId is required');
    if (!eventType) throw new BadRequestException('eventType is required');

    const branchSessions = Array.from(this.activeSessions.values()).filter(
      (s) => s.branchId === branchId && s.isActive,
    );

    const broadcast = {
      eventType,
      branchId,
      payload: payload ?? {},
      timestamp: new Date().toISOString(),
      recipientCount: branchSessions.length,
    };

    // TODO: BroadcastEvent model does not exist in the Prisma schema yet.
    // await this.prisma.broadcastEvent.create({ data: { branchId, eventType, payload, recipientCount, createdAt } });

    return broadcast;
  }

  async getActiveSessions(branchId?: string) {
    const sessions = Array.from(this.activeSessions.values()).filter(
      (s) => s.isActive && (!branchId || s.branchId === branchId),
    );

    return {
      branchId: branchId ?? null,
      totalSessions: sessions.length,
      sessions: sessions.map((s) => ({
        sessionId: s.sessionId,
        userId: s.userId,
        branchId: s.branchId,
        connectedAt: s.connectedAt.toISOString(),
        lastHeartbeat: s.lastHeartbeat.toISOString(),
        deviceInfo: s.deviceInfo,
      })),
    };
  }

  async getSession(sessionId: string) {
    if (!sessionId) throw new BadRequestException('sessionId is required');

    const session = this.activeSessions.get(sessionId);
    if (!session || !session.isActive) {
      // TODO: RealTimeSession model does not exist in the Prisma schema yet.
      // const dbSession = await this.prisma.realTimeSession.findUnique({ where: { sessionId } });
      // Session persistence not available; only in-memory sessions are tracked.
      throw new NotFoundException('Session not found');
    }

    return {
      sessionId: session.sessionId,
      userId: session.userId,
      branchId: session.branchId,
      connectedAt: session.connectedAt.toISOString(),
      lastHeartbeat: session.lastHeartbeat.toISOString(),
      isActive: session.isActive,
      deviceInfo: session.deviceInfo,
    };
  }
}
