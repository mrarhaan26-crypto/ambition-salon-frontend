import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OfflineModeService } from './offline-mode.service';

@Controller('offline')
export class OfflineModeController {
  constructor(private readonly service: OfflineModeService) {}

  @Post('queue')
  queueAction(
    @Body('userId') userId: string,
    @Body('deviceId') deviceId: string,
    @Body('action') action: string,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId?: string,
    @Body('payload') payload?: any,
  ) {
    return this.service.queueAction(userId, deviceId, action, entityType, entityId, payload);
  }

  @Post('sync')
  syncActions(
    @Body('userId') userId: string,
    @Body('deviceId') deviceId: string,
  ) {
    return this.service.syncActions(userId, deviceId);
  }

  @Get('queue/:userId/:deviceId')
  getQueuedActions(
    @Param('userId') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.service.getQueuedActions(userId, deviceId);
  }

  @Post('retry/:id')
  retryFailed(@Param('id') id: string) {
    return this.service.retryFailed(id);
  }
}
