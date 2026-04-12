import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { networkInterfaces } from 'os';
import { extname, join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OSS = require('ali-oss');

interface UploadFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);
  private readonly uploadDir: string;
  private ossClient: any = null;
  private readonly ossBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir = join(process.cwd(), 'uploads');
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    const endpoint = this.config.get('OSS_ENDPOINT', '');
    const accessKeyId = this.config.get('OSS_ACCESS_KEY_ID', '');
    const accessKeySecret = this.config.get('OSS_ACCESS_KEY_SECRET', '');
    const bucket = this.config.get('OSS_BUCKET', '');
    this.ossBaseUrl = this.config.get('OSS_BASE_URL', '');

    if (endpoint && accessKeyId && accessKeySecret && bucket) {
      this.ossClient = new OSS({
        region: this.extractRegion(endpoint),
        endpoint,
        accessKeyId,
        accessKeySecret,
        bucket,
      });
      this.logger.log(`OSS 已配置: bucket=${bucket}, endpoint=${endpoint}`);
    } else {
      this.logger.warn('OSS 未配置，上传将使用本地存储');
    }
  }

  async upload(file: UploadFile): Promise<{ url: string; filename: string; size: number }> {
    const filename = this.generateFilename(file);

    if (this.ossClient) {
      return this.uploadToOss(file, filename);
    }
    return this.uploadToLocal(file, filename);
  }

  private async uploadToOss(file: UploadFile, filename: string) {
    const ossKey = `assets/${filename}`;

    const result = await this.ossClient!.put(ossKey, file.buffer, {
      headers: { 'Content-Type': file.mimetype },
    });

    const url = this.ossBaseUrl
      ? `${this.ossBaseUrl.replace(/\/$/, '')}/${ossKey}`
      : (result as any).url;

    this.logger.log(`OSS 上传: ${ossKey} (${file.size} bytes)`);
    return { url, filename, size: file.size };
  }

  private async uploadToLocal(file: UploadFile, filename: string) {
    const dest = join(this.uploadDir, filename);
    writeFileSync(dest, file.buffer);

    const port = this.config.get('PORT', '3000');
    const localIp = this.getLocalIp();
    const url = `http://${localIp}:${port}/uploads/${filename}`;

    this.logger.log(`本地存储: ${filename} (${file.size} bytes)`);
    return { url, filename, size: file.size };
  }

  private generateFilename(file: UploadFile): string {
    const hash = createHash('md5').update(file.buffer).digest('hex').slice(0, 12);
    const ext = extname(file.originalname) || this.guessExt(file.mimetype);
    return `${hash}_${randomUUID().slice(0, 8)}${ext}`;
  }

  private extractRegion(endpoint: string): string {
    const m = endpoint.match(/oss-([\w-]+)\./);
    return m ? `oss-${m[1]}` : '';
  }

  private getLocalIp(): string {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
    return '127.0.0.1';
  }

  private guessExt(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
    };
    return map[mimetype] || '.bin';
  }
}
