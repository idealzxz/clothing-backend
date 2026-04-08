import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmAgreementDto {
  @ApiProperty({ description: '协议版本号', minLength: 2 })
  @IsString()
  @MinLength(2)
  agreementVersion!: string;
}
