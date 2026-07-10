import { IsArray, IsOptional, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  branchId!: string;

  @IsString()
  toPhone!: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  bookingId?: string;
}
