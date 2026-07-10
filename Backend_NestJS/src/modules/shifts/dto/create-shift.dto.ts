import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class ShiftTemplateCreateDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMin?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
