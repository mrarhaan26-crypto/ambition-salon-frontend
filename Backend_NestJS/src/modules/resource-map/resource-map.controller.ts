import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ResourceMapService } from './resource-map.service';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { CreateElementDto } from './dto/create-element.dto';

@Controller('resource-maps')
export class ResourceMapController {
  constructor(private readonly service: ResourceMapService) {}

  @Get(':branchId')
  getFloorPlans(@Param('branchId') branchId: string) {
    return this.service.getFloorPlans(branchId);
  }

  @Get('plan/:id')
  getFloorPlan(@Param('id') id: string) {
    return this.service.getFloorPlan(id);
  }

  @Post('plan')
  createFloorPlan(@Body() dto: CreateFloorPlanDto) {
    return this.service.createFloorPlan(dto.branchId, dto);
  }

  @Patch('plan/:id')
  updateFloorPlan(@Param('id') id: string, @Body() dto: Partial<CreateFloorPlanDto>) {
    return this.service.updateFloorPlan(id, dto);
  }

  @Delete('plan/:id')
  deleteFloorPlan(@Param('id') id: string) {
    return this.service.deleteFloorPlan(id);
  }

  @Post('element')
  addElement(@Body() dto: CreateElementDto) {
    return this.service.addElement(dto.floorPlanId, dto);
  }

  @Patch('element/:id')
  updateElement(@Param('id') id: string, @Body() dto: Partial<CreateElementDto>) {
    return this.service.updateElement(id, dto);
  }

  @Delete('element/:id')
  deleteElement(@Param('id') id: string) {
    return this.service.deleteElement(id);
  }

  @Patch('element/:id/status')
  updateElementStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.service.updateElementStatus(id, body.status);
  }
}
