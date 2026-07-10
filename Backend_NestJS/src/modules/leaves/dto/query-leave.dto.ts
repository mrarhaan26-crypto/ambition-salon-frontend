import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';

export class QueryLeaveDto {
  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsEnum(['CASUAL', 'SICK', 'MEDICAL', 'VACATION', 'MATERNITY', 'PATERNITY', 'UNPAID', 'EMERGENCY', 'PUBLIC_HOLIDAY', 'HALF_DAY'])
  leaveType?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
