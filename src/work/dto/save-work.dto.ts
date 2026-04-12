import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveWorkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resultId?: string;

  @ApiProperty()
  @IsString()
  resultType!: string;

  @ApiProperty()
  @IsString()
  resultUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  generationParams?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}
