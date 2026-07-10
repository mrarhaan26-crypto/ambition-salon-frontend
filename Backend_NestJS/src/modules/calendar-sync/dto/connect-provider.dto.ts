import { IsOptional, IsString } from 'class-validator';

export class ConnectProviderDto {
  @IsString()
  staffId!: string;

  @IsString()
  provider!: string;

  @IsString()
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  tokenExpiry?: string;

  @IsOptional()
  @IsString()
  calendarId?: string;

  @IsOptional()
  @IsString()
  calendarName?: string;

  @IsOptional()
  @IsString()
  syncDirection?: string;
}
