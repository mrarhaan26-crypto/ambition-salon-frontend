import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { OnlineBookingService } from './online-booking.service';
import { OnlineBookingCreateDto } from './dto/create-online-booking.dto';
import { PortalSettingsDto } from './dto/portal-settings.dto';
import { SlotQueryDto } from './dto/query-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('online-bookings')
export class OnlineBookingController {
  constructor(private readonly service: OnlineBookingService) {}

  @Get('portal/:slug')
  getPublicPortal(@Param('slug') slug: string) {
    return this.service.getPublicPortal(slug);
  }

  @Get('slots')
  getAvailableSlots(
    @Query(new ValidationPipe({ whitelist: true, transform: true }))
    query: SlotQueryDto,
  ) {
    return this.service.getAvailableSlots(query);
  }

  @Post()
  createBooking(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: OnlineBookingCreateDto,
  ) {
    return this.service.createBooking(body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/confirm')
  confirmBooking(@Param('id') id: string) {
    return this.service.confirmBooking(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.service.cancelBooking(id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings/:branchId')
  getPortalSettings(@Param('branchId') branchId: string) {
    return this.service.getPortalSettings(branchId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('settings/:branchId')
  upsertPortalSettings(
    @Param('branchId') branchId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    body: PortalSettingsDto,
  ) {
    return this.service.upsertPortalSettings(branchId, body);
  }
}
