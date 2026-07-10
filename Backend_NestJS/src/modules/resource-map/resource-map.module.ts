import { Module } from '@nestjs/common';
import { ResourceMapController } from './resource-map.controller';
import { ResourceMapService } from './resource-map.service';

@Module({
  controllers: [ResourceMapController],
  providers: [ResourceMapService],
  exports: [ResourceMapService],
})
export class ResourceMapModule {}
