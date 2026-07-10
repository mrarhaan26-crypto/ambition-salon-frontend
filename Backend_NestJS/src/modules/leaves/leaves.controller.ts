import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { UpdateLeaveDto, ApproveLeaveDto, RejectLeaveDto } from './dto/update-leave.dto';
import { QueryLeaveDto } from './dto/query-leave.dto';

@Controller('leaves')
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Post()
  create(@Body() dto: CreateLeaveDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryLeaveDto) {
    return this.service.findAll(query);
  }

  @Get('stats/:staffId')
  getStats(@Param('staffId') staffId: string) {
    return this.service.getStats(staffId);
  }

  @Get('today')
  getTodayLeaves(@Query('branchId') branchId?: string) {
    return this.service.getTodayLeaves(branchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLeaveDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/approve')
  approve(@Param('id') id: string, @Body() dto: ApproveLeaveDto) {
    return this.service.approve(id, dto, 'system');
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectLeaveDto) {
    return this.service.reject(id, dto, 'system');
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id, 'system');
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
