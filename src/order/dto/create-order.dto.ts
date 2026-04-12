import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ description: '积分包 ID' })
  @IsInt()
  @Min(1)
  packageId!: number;
}
