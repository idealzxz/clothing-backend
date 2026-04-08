import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface JimengSubmitInput {
  taskType: 'photo' | 'video';
  presetId: string;
  ratio: string;
  count: number;
  assets: Array<{ url: string; partType?: string }>;
}

interface JimengSubmitResult {
  providerTaskId: string;
  outputUrls: string[];
}

@Injectable()
export class JimengProvider {
  async submit(input: JimengSubmitInput): Promise<JimengSubmitResult> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const providerTaskId = `jimeng_${randomUUID()}`;
    const outputUrls = new Array(input.count).fill(null).map((_item, idx) => {
      return `https://cdn.example.com/jimeng/${providerTaskId}/result-${idx + 1}.jpg`;
    });
    return { providerTaskId, outputUrls };
  }
}
