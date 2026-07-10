import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class PortalSettingsDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  welcomeMessage?: string;

  @IsOptional()
  @IsString()
  bookingRules?: string;

  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @IsOptional()
  @IsNumber()
  depositPercent?: number;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsBoolean()
  allowGuestBooking?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePhone?: boolean;

  @IsOptional()
  @IsBoolean()
  requireEmail?: boolean;

  @IsOptional()
  @IsNumber()
  maxAdvanceDays?: number;

  @IsOptional()
  @IsNumber()
  minAdvanceHours?: number;

  @IsOptional()
  @IsNumber()
  slotDurationMin?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
