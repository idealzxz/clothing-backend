import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class CreateModelPresetDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String] }) @IsArray() referenceImages!: string[];
  @ApiProperty() @IsString() gender!: string;
  @ApiProperty() @IsString() ageRange!: string;
  @ApiProperty() @IsString() bodyType!: string;
  @ApiProperty({ type: [String] }) @IsArray() styleTags!: string[];
}

export class CreateScenePresetDto {
  @ApiProperty() @IsString() name!: string;
  @ApiProperty({ type: [String] }) @IsArray() referenceImages!: string[];
  @ApiProperty() @IsString() sceneType!: string;
  @ApiProperty({ type: [String] }) @IsArray() keywords!: string[];
}
