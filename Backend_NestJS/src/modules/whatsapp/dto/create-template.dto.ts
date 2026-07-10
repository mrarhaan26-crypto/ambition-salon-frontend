import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];
}
