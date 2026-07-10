import { IsString, IsOptional, IsArray, IsEmail } from 'class-validator';

export class OnlineBookingCreateDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  branchId!: string;

  @IsString()
  clientName!: string;

  @IsString()
  clientPhone!: string;

  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @IsOptional()
  @IsString()
  staffId?: string;

  @IsArray()
  @IsString({ each: true })
  serviceIds!: string[];

  @IsString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
