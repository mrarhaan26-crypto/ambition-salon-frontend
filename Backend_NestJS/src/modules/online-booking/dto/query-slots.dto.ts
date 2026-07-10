import { IsString, IsOptional } from 'class-validator';

export class SlotQueryDto {
  @IsString()
  branchId!: string;

  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;
}
