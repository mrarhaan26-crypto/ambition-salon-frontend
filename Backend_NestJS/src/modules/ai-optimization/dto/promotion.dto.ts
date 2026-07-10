import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  branchId!: string;

  @IsString()
  name!: string;

  @IsString()
  type!: string;

  @IsOptional() @IsString()
  targetSegment?: string;

  @IsOptional() @IsString()
  content?: string;

  @IsOptional() @IsString()
  channel?: string;

  @IsOptional() @IsString()
  discountType?: string;

  @IsOptional() @IsNumber()
  discountValue?: number;

  @IsOptional() @IsString()
  status?: string;

  @IsOptional() @IsString()
  scheduledAt?: string;
}
