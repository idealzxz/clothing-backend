import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishRecipeDto {
  @ApiProperty({ maxLength: 20 })
  @IsString()
  @MaxLength(20)
  recipeName!: string;

  @ApiProperty()
  @IsString()
  coverImageUrl!: string;

  @ApiProperty()
  @IsObject()
  presetSnapshot!: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class SaveMyRecipeDto {
  @ApiProperty()
  @IsString()
  recipeName!: string;

  @ApiProperty()
  @IsObject()
  customPresetSnapshot!: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collectionId?: string;
}
