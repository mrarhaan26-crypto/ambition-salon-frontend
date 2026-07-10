import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftTemplateCreateDto } from './dto/create-shift.dto';
import { ShiftAssignmentCreateDto } from './dto/create-assignment.dto';
import { ShiftSwapDto, ApproveSwapDto } from './dto/swap-shift.dto';
import { ShiftQueryDto } from './dto/query-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Post()
  create(@Body() dto: ShiftTemplateCreateDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: ShiftQueryDto) {
    return this.service.findAll(query.branchId, query);
  }

  @Get('templates/:branchId')
  getTemplates(@Param('branchId') branchId: string) {
    return this.service.getTemplates(branchId);
  }

  @Get('assignments')
  getAssignments(
    @Query('branchId') branchId: string,
    @Query('date') date: string,
    @Query('staffId') staffId?: string,
  ) {
    return this.service.getAssignments(branchId, date, staffId);
  }

  @Get('stats')
  getStats(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.getStats(branchId, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: ShiftTemplateCreateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('assignments')
  createAssignment(@Body() dto: ShiftAssignmentCreateDto) {
    return this.service.createAssignment(dto);
  }

  @Post('swap')
  swapShifts(@Body() dto: ShiftSwapDto) {
    return this.service.swapShifts(dto);
  }

  @Patch('swap/:id')
  approveSwap(@Param('id') id: string, @Body() dto: ApproveSwapDto) {
    return this.service.approveSwap(id, 'system');
  }
}
