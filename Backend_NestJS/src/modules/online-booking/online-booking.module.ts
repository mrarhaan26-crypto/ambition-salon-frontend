import { Module } from '@nestjs/common';
import { OnlineBookingController } from './online-booking.controller';
import { OnlineBookingService } from './online-booking.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [OnlineBookingController],
  providers: [OnlineBookingService],
})
export class OnlineBookingModule {}
