import { Module } from '@nestjs/common';
import { OfflineModeController } from './offline-mode.controller';
import { OfflineModeService } from './offline-mode.service';

@Module({
  controllers: [OfflineModeController],
  providers: [OfflineModeService],
  exports: [OfflineModeService],
})
export class OfflineModeModule {}
