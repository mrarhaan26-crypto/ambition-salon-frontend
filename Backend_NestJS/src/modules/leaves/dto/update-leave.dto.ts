import { IsString, IsOptional, IsDateString, IsEnum, IsBoolean, IsUrl } from 'class-validator';
import { LeaveTypeDto } from './create-leave.dto';

export enum LeaveStatusDto {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export class UpdateLeaveDto {
  @IsOptional()
  @IsEnum(LeaveTypeDto)
  leaveType?: LeaveTypeDto;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

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
}

export class ApproveLeaveDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectLeaveDto {
  @IsString()
  rejectReason!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
