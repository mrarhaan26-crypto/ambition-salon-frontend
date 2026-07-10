import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ShiftAssignmentCreateDto {
  @IsString()
  branchId!: string;

  @IsString()
  staffId!: string;

  @IsString()
  shiftId!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
