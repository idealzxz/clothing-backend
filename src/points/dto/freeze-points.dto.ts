import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class FreezePointsDto {
  @ApiProperty({ description: '冻结数量', minimum: 1 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ description: '业务幂等 ID' })
  @IsString()
  bizId!: string;
}
