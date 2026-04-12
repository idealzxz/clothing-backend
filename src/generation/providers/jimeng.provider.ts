import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Signer from '@volcengine/openapi/lib/base/sign';
import { randomUUID } from 'crypto';

const VOLCENGINE_API_HOST = 'visual.volcengineapi.com';
const VOLCENGINE_API_URL = `https://${VOLCENGINE_API_HOST}`;
const API_VERSION = '2022-08-31';
const REGION = 'cn-north-1';
const SERVICE = 'cv';

const REQ_KEY_T2I_V40 = 'jimeng_t2i_v40';

const RATIO_TO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 2048, height: 2048 },
  '3:4': { width: 1728, height: 2304 },
  '4:3': { width: 2304, height: 1728 },
  '9:16': { width: 1440, height: 2560 },
  '16:9': { width: 2560, height: 1440 },
  '3:2': { width: 2496, height: 1664 },
  '2:3': { width: 1664, height: 2496 },
  '21:9': { width: 3024, height: 1296 },
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 120;

export interface JimengSubmitInput {
  taskType: 'photo' | 'video';
  prompt?: string;
  presetId: string;
  ratio: string;
  count: number;
  assets: Array<{ url: string; partType?: string }>;
}

export interface JimengSubmitResult {
  providerTaskId: string;
  outputUrls: string[];
}

@Injectable()
export class JimengProvider {
  private readonly logger = new Logger(JimengProvider.name);
  private readonly accessKey: string;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.accessKey = this.configService.get('JIMENG_ACCESS_KEY', '');
    this.secretKey = this.configService.get('JIMENG_SECRET_KEY', '');
  }

  get isConfigured(): boolean {
    return !!(this.accessKey && this.secretKey);
  }

  async submit(input: JimengSubmitInput): Promise<JimengSubmitResult> {
    if (!this.isConfigured) {
      this.logger.warn('即梦 API 未配置 (JIMENG_ACCESS_KEY / JIMENG_SECRET_KEY 为空)，使用 Mock 模式');
      return this.mockSubmit(input);
    }

    this.logger.log(`调用即梦4.0 API: type=${input.taskType}, ratio=${input.ratio}, count=${input.count}`);

    const providerTaskId = await this.submitTask(input);
    this.logger.log(`即梦任务已提交: taskId=${providerTaskId}`);

    const outputUrls = await this.pollResult(providerTaskId);
    this.logger.log(`即梦任务完成: ${outputUrls.length} 张图片`);

    return { providerTaskId, outputUrls };
  }

  private async submitTask(input: JimengSubmitInput): Promise<string> {
    const imageUrls = input.assets.map((a) => a.url).filter(Boolean);
    const dimensions = RATIO_TO_DIMENSIONS[input.ratio] ?? RATIO_TO_DIMENSIONS['1:1'];

    this.logger.log(`submitTask: imageUrls=${JSON.stringify(imageUrls)}, dimensions=${JSON.stringify(dimensions)}`);

    const body: Record<string, any> = {
      req_key: REQ_KEY_T2I_V40,
      prompt: input.prompt || `生成${input.count}张服装图片`,
      scale: 0.5,
      seed: -1,
      width: dimensions.width,
      height: dimensions.height,
    };

    if (input.count === 1) {
      body.force_single = true;
    }

    if (imageUrls.length > 0) {
      body.image_urls = imageUrls.slice(0, 10);
    }

    const response = await this.signedRequest('CVSync2AsyncSubmitTask', body);

    this.logger.log(`submitTask 响应: code=${response.code}, message=${response.message}, task_id=${response.data?.task_id}`);

    if (response.code !== 10000) {
      throw new Error(`即梦提交任务失败: code=${response.code}, message=${response.message}`);
    }

    const taskId = response.data?.task_id;
    if (!taskId) {
      this.logger.error(`submitTask 未返回 task_id, 完整响应: ${JSON.stringify(response).slice(0, 1000)}`);
      throw new Error('即梦提交任务成功但未返回 task_id');
    }

    return taskId;
  }

  private async pollResult(taskId: string): Promise<string[]> {
    this.logger.log(`pollResult 开始轮询: taskId=${taskId}, 间隔=${POLL_INTERVAL_MS}ms, 最大次数=${POLL_MAX_ATTEMPTS}`);

    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await this.sleep(POLL_INTERVAL_MS);

      const body = {
        req_key: REQ_KEY_T2I_V40,
        task_id: taskId,
        req_json: JSON.stringify({ return_url: true }),
      };

      const response = await this.signedRequest('CVSync2AsyncGetResult', body);

      const status = response.data?.status;
      this.logger.log(`pollResult #${attempt + 1}: status=${status}, code=${response.code}`);

      if (status === 'done') {
        if (response.code !== 10000) {
          this.logger.error(`即梦任务完成但 code 异常: ${JSON.stringify(response).slice(0, 1000)}`);
          throw new Error(`即梦任务失败: code=${response.code}, message=${response.message}`);
        }
        const urls: string[] = response.data?.image_urls ?? [];
        this.logger.log(`pollResult 完成: ${urls.length} 张图片`);
        if (urls.length === 0) {
          this.logger.error(`即梦任务无图片, 完整响应: ${JSON.stringify(response).slice(0, 1000)}`);
          throw new Error('即梦任务完成但未返回图片');
        }
        return urls;
      }

      if (status === 'not_found' || status === 'expired') {
        this.logger.error(`即梦任务异常终止: status=${status}, 完整响应: ${JSON.stringify(response).slice(0, 1000)}`);
        throw new Error(`即梦任务异常: status=${status}`);
      }
    }

    throw new Error(`即梦任务超时: 超过 ${POLL_MAX_ATTEMPTS * POLL_INTERVAL_MS / 1000}s 未完成`);
  }

  private async signedRequest(action: string, body: Record<string, any>): Promise<any> {
    const bodyStr = JSON.stringify(body);

    this.logger.log(`signedRequest 开始: action=${action}, bodyLength=${bodyStr.length}`);
    this.logger.debug(`signedRequest body: ${bodyStr}`);

    const requestObj = {
      region: REGION,
      method: 'POST',
      params: {
        Action: action,
        Version: API_VERSION,
      },
      headers: {
        Host: VOLCENGINE_API_HOST,
        'Content-Type': 'application/json',
      } as Record<string, string>,
      body: bodyStr,
    };

    try {
      const signer = new Signer(requestObj, SERVICE);
      signer.addAuthorization({
        accessKeyId: this.accessKey,
        secretKey: this.secretKey,
      });
      this.logger.debug(`签名后 headers: ${JSON.stringify(requestObj.headers)}`);
    } catch (signErr: any) {
      this.logger.error(`签名失败: ${signErr?.message}`, signErr?.stack);
      throw new Error(`即梦 API 签名失败: ${signErr?.message}`);
    }

    const url = `${VOLCENGINE_API_URL}?Action=${action}&Version=${API_VERSION}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: requestObj.headers,
        body: bodyStr,
      });
    } catch (fetchErr: any) {
      this.logger.error(`fetch 网络异常: ${fetchErr?.message}`, fetchErr?.stack);
      throw new Error(`即梦 API 网络异常: ${fetchErr?.message}`);
    }

    const responseText = await res.text();
    this.logger.log(`signedRequest 响应: action=${action}, status=${res.status}, bodyLength=${responseText.length}`);
    this.logger.debug(`signedRequest 响应体: ${responseText.slice(0, 2000)}`);

    if (!res.ok) {
      this.logger.error(`即梦 API HTTP 错误: status=${res.status}, body=${responseText.slice(0, 1000)}`);
      throw new Error(`即梦 API HTTP ${res.status}: ${responseText.slice(0, 500)}`);
    }

    try {
      return JSON.parse(responseText);
    } catch (parseErr: any) {
      this.logger.error(`即梦 API 响应 JSON 解析失败: ${responseText.slice(0, 500)}`);
      throw new Error(`即梦 API 响应解析失败: ${parseErr?.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async mockSubmit(input: JimengSubmitInput): Promise<JimengSubmitResult> {
    await this.sleep(800);
    const providerTaskId = `jimeng_mock_${randomUUID()}`;
    const outputUrls = new Array(input.count).fill(null).map((_item, idx) => {
      return `https://cdn.example.com/jimeng/${providerTaskId}/result-${idx + 1}.jpg`;
    });
    return { providerTaskId, outputUrls };
  }
}
