import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RealTimeService } from './real-time.service';

@Controller('realtime')
export class RealTimeController {
  constructor(private readonly service: RealTimeService) {}

  @Post('connect')
  connect(
    @Body('userId') userId: string,
    @Body('sessionId') sessionId: string,
    @Body('branchId') branchId?: string,
    @Body('deviceInfo') deviceInfo?: any,
  ) {
    return this.service.connect(userId, sessionId, branchId, deviceInfo);
  }

  @Post('disconnect')
  disconnect(@Body('sessionId') sessionId: string) {
    return this.service.disconnect(sessionId);
  }

  @Post('heartbeat')
  heartbeat(@Body('sessionId') sessionId: string) {
    return this.service.heartbeat(sessionId);
  }

  @Post('broadcast')
  broadcast(
    @Body('branchId') branchId: string,
    @Body('eventType') eventType: string,
    @Body('payload') payload?: any,
  ) {
    return this.service.broadcastEvent(branchId, eventType, payload);
  }

  @Get('sessions/:branchId')
  getActiveSessions(@Param('branchId') branchId: string) {
    return this.service.getActiveSessions(branchId);
  }
}
