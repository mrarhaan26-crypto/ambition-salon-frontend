import { IsOptional, IsString } from 'class-validator';

export class OptimizationQueryDto {
  @IsOptional() @IsString()
  branchId?: string;

  @IsOptional() @IsString()
  date?: string;

  @IsOptional() @IsString()
  hour?: string;

  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;
}
