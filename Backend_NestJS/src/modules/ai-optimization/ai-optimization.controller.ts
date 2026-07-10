import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AiOptimizationService } from './ai-optimization.service';
import { CreatePromotionDto } from './dto/promotion.dto';

@Controller('ai')
export class AiOptimizationController {
  constructor(private readonly service: AiOptimizationService) {}

  @Get('chairs/:branchId/:date')
  analyzeChairUtilization(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.service.analyzeChairUtilization(branchId, date);
  }

  @Get('staff/:branchId/:date')
  analyzeStaffUtilization(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.service.analyzeStaffUtilization(branchId, date);
  }

  @Get('revenue/:branchId/:date')
  getRevenueOptimization(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.service.getRevenueOptimization(branchId, date);
  }

  @Get('heatmap/:branchId/:date')
  generateHeatmap(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
    @Query('hour') hour?: string,
  ) {
    return this.service.generateHeatmap(branchId, date, hour ? Number(hour) : undefined);
  }

  @Get('predictions/:branchId/:date')
  predictBookings(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.service.predictBookings(branchId, date);
  }

  @Get('no-shows/:branchId/:date')
  predictNoShows(
    @Param('branchId') branchId: string,
    @Param('date') date: string,
  ) {
    return this.service.predictNoShows(branchId, date);
  }

  @Post('waitlist-fill')
  autoFillWaitlist(@Body() body: { branchId: string; cancelledBookingId: string }) {
    return this.service.autoFillWaitlist(body.branchId, body.cancelledBookingId);
  }

  @Get('routes/:branchId')
  getServiceRoutes(@Param('branchId') branchId: string) {
    return this.service.getServiceRoutes(branchId);
  }

  @Post('optimize-route')
  optimizeRoute(@Body() body: { branchId: string; serviceIds: string[] }) {
    return this.service.optimizeRoute(body.branchId, body.serviceIds);
  }

  @Get('promotions/:branchId')
  getSmartPromotions(@Param('branchId') branchId: string) {
    return this.service.getSmartPromotions(branchId);
  }

  @Post('promotions')
  createSmartPromotion(@Body() dto: CreatePromotionDto) {
    return this.service.createSmartPromotion(dto.branchId, dto);
  }

  @Get('dashboard')
  getDashboard(
    @Query('branchId') branchId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getDashboard(branchId, { from, to });
  }
}
