import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CalendarSyncService } from './calendar-sync.service';
import { ConnectProviderDto } from './dto/connect-provider.dto';
import { SyncRequestDto } from './dto/sync.dto';

@Controller('calendar-sync')
export class CalendarSyncController {
  constructor(private readonly service: CalendarSyncService) {}

  @Post('connect')
  connectProvider(@Body() dto: ConnectProviderDto) {
    return this.service.connectProvider(dto.staffId, dto);
  }

  @Delete(':staffId/:provider')
  disconnectProvider(
    @Param('staffId') staffId: string,
    @Param('provider') provider: string,
  ) {
    return this.service.disconnectProvider(staffId, provider);
  }

  @Get(':staffId')
  getConnections(@Param('staffId') staffId: string) {
    return this.service.getConnections(staffId);
  }

  @Post('sync/:staffId/:provider')
  syncToExternal(
    @Param('staffId') staffId: string,
    @Param('provider') provider: string,
    @Body() dto: SyncRequestDto,
  ) {
    if (dto.bookingId) {
      return this.service.syncToExternal(staffId, provider, dto.bookingId);
    }
    return this.service.syncFromExternal(staffId, provider);
  }

  @Post('webhook/:provider')
  handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.service.handleWebhook(provider, payload);
  }

  @Get('logs/:staffId')
  getSyncLogs(
    @Param('staffId') staffId: string,
    @Query('provider') provider?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getSyncLogs(
      staffId,
      provider,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
