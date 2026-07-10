import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsUrl } from 'class-validator';

export enum LeaveTypeDto {
  CASUAL = 'CASUAL',
  SICK = 'SICK',
  MEDICAL = 'MEDICAL',
  VACATION = 'VACATION',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID',
  EMERGENCY = 'EMERGENCY',
  PUBLIC_HOLIDAY = 'PUBLIC_HOLIDAY',
  HALF_DAY = 'HALF_DAY',
}

export class CreateLeaveDto {
  @IsString()
  staffId!: string;

  @IsEnum(LeaveTypeDto)
  leaveType!: LeaveTypeDto;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  halfDay?: boolean;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsUrl()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
