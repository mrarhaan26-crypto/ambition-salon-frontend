import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { VoiceBookingService } from './voice-booking.service';

@Controller('voice')
export class VoiceBookingController {
  constructor(private readonly service: VoiceBookingService) {}

  @Post('command')
  processCommand(
    @Body('staffId') staffId: string,
    @Body('text') text: string,
  ) {
    return this.service.processCommand(staffId, text);
  }

  @Get('logs/:staffId')
  getVoiceLogs(
    @Param('staffId') staffId: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getVoiceLogs(staffId, limit);
  }
}
