import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class BookingQueryDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class SlotQueryDto {
  @IsString()
  branchId!: string;

  @IsString()
  staffId!: string;

  @IsDateString()
  date!: string;

  @Type(() => Number)
  durationMin!: number;

  @IsOptional()
  @Type(() => Number)
  slotIntervalMin?: number;
}
