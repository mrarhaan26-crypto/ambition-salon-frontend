import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { LogQueryDto } from './dto/query-logs.dto';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly service: WhatsAppService) {}

  @Get('templates')
  getTemplates() {
    return this.service.getTemplates();
  }

  @Post('templates')
  createTemplate(@Body() dto: CreateTemplateDto) {
    return this.service.createTemplate(dto);
  }

  @Post('send')
  sendMessage(@Body() dto: SendMessageDto) {
    if (dto.templateName) {
      return this.service.sendTemplate(
        dto.branchId,
        dto.toPhone,
        dto.templateName,
        dto.variables,
      );
    }
    return this.service.sendText(dto.branchId, dto.toPhone, dto.message ?? '');
  }

  @Post('send/booking-confirmation')
  sendBookingConfirmation(@Body('bookingId') bookingId: string) {
    return this.service.sendBookingConfirmation(bookingId);
  }

  @Post('send/reminder')
  sendReminder(@Body('bookingId') bookingId: string) {
    return this.service.sendReminder(bookingId);
  }

  @Post('send/otp')
  sendOTP(@Body('clientId') clientId: string, @Body('otp') otp: string) {
    return this.service.sendOTP(clientId, otp);
  }

  @Post('send/invoice')
  sendInvoice(@Body('invoiceId') invoiceId: string) {
    return this.service.sendInvoice(invoiceId);
  }

  @Post('send/review')
  sendReviewRequest(@Body('bookingId') bookingId: string) {
    return this.service.sendReviewRequest(bookingId);
  }

  @Post('send/birthday')
  sendBirthdayWish(@Body('clientId') clientId: string) {
    return this.service.sendBirthdayWish(clientId);
  }

  @Post('send/cancellation')
  sendCancellationNotice(@Body('bookingId') bookingId: string) {
    return this.service.sendCancellationNotice(bookingId);
  }

  @Post('send/follow-up')
  sendFollowUp(@Body('clientId') clientId: string) {
    return this.service.sendFollowUp(clientId);
  }

  @Get('logs')
  getLogs(
    @Query('branchId') branchId: string,
    @Query() query: LogQueryDto,
  ) {
    return this.service.getLogs(branchId, query);
  }

  @Get('stats')
  getStats(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getStats(branchId, { from, to });
  }
}
