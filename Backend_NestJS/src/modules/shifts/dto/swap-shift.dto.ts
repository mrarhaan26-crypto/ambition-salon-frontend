import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ShiftSwapDto {
  @IsString()
  requesterId!: string;

  @IsString()
  targetId!: string;

  @IsString()
  requesterShiftId!: string;

  @IsString()
  targetShiftId!: string;

  @IsDateString()
  requesterDate!: string;

  @IsDateString()
  targetDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveSwapDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
