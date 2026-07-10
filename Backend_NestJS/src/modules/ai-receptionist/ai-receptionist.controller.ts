import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AiReceptionistService } from './ai-receptionist.service';

@Controller('ai-receptionist')
export class AiReceptionistController {
  constructor(private readonly service: AiReceptionistService) {}

  @Post('message')
  processMessage(
    @Body('channel') channel: string,
    @Body('direction') direction: string,
    @Body('content') content: string,
    @Body('clientId') clientId?: string,
  ) {
    return this.service.processMessage(channel, direction, content, clientId);
  }

  @Post('whatsapp')
  handleWhatsApp(@Body() message: any) {
    return this.service.handleWhatsApp(message);
  }

  @Post('call')
  handleCall(@Body() callData: any) {
    return this.service.handleCall(callData);
  }

  @Post('voice')
  handleVoice(@Body() voiceData: any) {
    return this.service.handleVoice(voiceData);
  }

  @Get('logs')
  getLogs(
    @Query('channel') channel?: string,
    @Query('limit') limit?: number,
  ) {
    return this.service.getLogs(channel, limit);
  }

  @Get('stats')
  getStats(
    @Query('channel') channel?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const dateRange = from && to ? { from, to } : undefined;
    return this.service.getStats(channel, dateRange);
  }
}
