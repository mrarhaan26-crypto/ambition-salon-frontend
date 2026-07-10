import { IsOptional, IsString } from 'class-validator';

export class SyncRequestDto {
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsOptional()
  @IsString()
  direction?: string;
}
