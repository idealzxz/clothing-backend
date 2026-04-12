import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        clarityDetectionEnabled: false,
        backgroundNoiseDetectionEnabled: false,
      },
    });
    return {
      clarityDetectionEnabled: settings.clarityDetectionEnabled,
      backgroundNoiseDetectionEnabled: settings.backgroundNoiseDetectionEnabled,
    };
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    const data: any = {};
    if (dto.clarityDetectionEnabled !== undefined) {
      data.clarityDetectionEnabled = dto.clarityDetectionEnabled;
    }
    if (dto.backgroundNoiseDetectionEnabled !== undefined) {
      data.backgroundNoiseDetectionEnabled = dto.backgroundNoiseDetectionEnabled;
    }

    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        clarityDetectionEnabled: dto.clarityDetectionEnabled ?? false,
        backgroundNoiseDetectionEnabled: dto.backgroundNoiseDetectionEnabled ?? false,
      },
    });
    return {
      clarityDetectionEnabled: settings.clarityDetectionEnabled,
      backgroundNoiseDetectionEnabled: settings.backgroundNoiseDetectionEnabled,
    };
  }
}
