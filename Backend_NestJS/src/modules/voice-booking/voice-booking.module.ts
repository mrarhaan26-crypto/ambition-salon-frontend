import { Module } from '@nestjs/common';
import { VoiceBookingController } from './voice-booking.controller';
import { VoiceBookingService } from './voice-booking.service';

@Module({
  controllers: [VoiceBookingController],
  providers: [VoiceBookingService],
  exports: [VoiceBookingService],
})
export class VoiceBookingModule {}
