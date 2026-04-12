import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { AssetService } from './asset.service';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

@ApiTags('assets')
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE },
      fileFilter: (_req, file, cb) => {
        if (/^(image|video)\//.test(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不支持的文件类型: ${file.mimetype}`), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: '上传素材文件（图片/视频）' })
  async upload(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('缺少文件字段 file');
    }
    return this.assetService.upload(file);
  }
}
