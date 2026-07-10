import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreateFloorPlanDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsOptional() @IsNumber()
  width?: number;

  @IsOptional() @IsNumber()
  height?: number;

  @IsOptional() @IsString()
  backgroundImage?: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
