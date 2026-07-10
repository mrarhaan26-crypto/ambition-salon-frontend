import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateElementDto {
  @IsString()
  floorPlanId!: string;

  @IsOptional() @IsString()
  resourceId?: string;

  @IsString()
  type!: string;

  @IsOptional() @IsString()
  label?: string;

  @IsOptional() @IsNumber()
  x?: number;

  @IsOptional() @IsNumber()
  y?: number;

  @IsOptional() @IsNumber()
  width?: number;

  @IsOptional() @IsNumber()
  height?: number;

  @IsOptional() @IsNumber()
  rotation?: number;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsString()
  status?: string;
}
