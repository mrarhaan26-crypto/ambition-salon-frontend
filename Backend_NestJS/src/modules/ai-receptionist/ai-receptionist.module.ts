import { Module } from '@nestjs/common';
import { AiReceptionistController } from './ai-receptionist.controller';
import { AiReceptionistService } from './ai-receptionist.service';

@Module({
  controllers: [AiReceptionistController],
  providers: [AiReceptionistService],
  exports: [AiReceptionistService],
})
export class AiReceptionistModule {}
