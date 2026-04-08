import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class WechatLoginDto {
  @ApiProperty({ description: '微信登录 code', minLength: 4 })
  @IsString()
  @MinLength(4)
  code!: string;
}
