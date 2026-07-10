import { Module } from '@nestjs/common';
import { RealTimeController } from './real-time.controller';
import { RealTimeService } from './real-time.service';

@Module({
  controllers: [RealTimeController],
  providers: [RealTimeService],
  exports: [RealTimeService],
})
export class RealTimeModule {}
