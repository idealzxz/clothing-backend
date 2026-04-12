import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class AssetDto {
  @ApiProperty({ description: '素材 URL' })
  @IsUrl()
  url!: string;

  @ApiPropertyOptional({ description: '部位类型' })
  @IsOptional()
  @IsString()
  partType?: string;
}

@ApiExtraModels(AssetDto)
export class CreateJimengTaskDto {
  @ApiProperty({ description: '客户端请求 ID' })
  @IsString()
  clientRequestId!: string;

  @ApiProperty({ enum: ['photo', 'video'], description: '任务类型' })
  @IsIn(['photo', 'video'])
  taskType!: 'photo' | 'video';

  @ApiPropertyOptional({ description: '生成提示词（即梦4.0 prompt）' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiProperty({ description: '预设 ID' })
  @IsString()
  presetId!: string;

  @ApiProperty({
    enum: ['1:1', '3:4', '4:3', '9:16', '16:9'],
    description: '画幅比例',
  })
  @IsIn(['1:1', '3:4', '4:3', '9:16', '16:9'])
  ratio!: string;

  @ApiProperty({ description: '生成数量', minimum: 1, maximum: 4 })
  @IsInt()
  @Min(1)
  @Max(4)
  count!: number;

  @ApiProperty({ type: [AssetDto], description: '素材列表' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetDto)
  assets!: AssetDto[];

  @ApiPropertyOptional({ description: '积分消耗（可选）', minimum: 0 })
  @IsInt()
  @IsOptional()
  @Min(0)
  pointsCost?: number;
}
