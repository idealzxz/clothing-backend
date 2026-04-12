import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PresetService {
  constructor(private readonly prisma: PrismaService) {}

  async listModelPresets(query: { source?: string; gender?: string }) {
    const where: any = {};
    if (query.source) where.source = query.source;
    if (query.gender) where.gender = query.gender;
    return this.prisma.modelPreset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listScenePresets(query: { source?: string; sceneType?: string }) {
    const where: any = {};
    if (query.source) where.source = query.source;
    if (query.sceneType) where.sceneType = query.sceneType;
    return this.prisma.scenePreset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async listTemplates(query: { category?: string; isHot?: boolean }) {
    const where: any = {};
    if (query.category) where.category = query.category;
    if (query.isHot !== undefined) where.isHot = query.isHot;
    return this.prisma.templatePreset.findMany({
      where,
      include: { modelPreset: true, scenePreset: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplate(id: number) {
    const template = await this.prisma.templatePreset.findUnique({
      where: { id },
      include: { modelPreset: true, scenePreset: true },
    });
    if (!template) throw new NotFoundException('模板不存在');
    return template;
  }

  async createModelPreset(userId: string, data: {
    name: string;
    referenceImages: string[];
    gender: string;
    ageRange: string;
    bodyType: string;
    styleTags: string[];
  }) {
    return this.prisma.modelPreset.create({
      data: {
        ...data,
        referenceImages: data.referenceImages as any,
        styleTags: data.styleTags as any,
        source: 'user',
        createdBy: userId,
      },
    });
  }

  async createScenePreset(userId: string, data: {
    name: string;
    referenceImages: string[];
    sceneType: string;
    keywords: string[];
  }) {
    return this.prisma.scenePreset.create({
      data: {
        ...data,
        referenceImages: data.referenceImages as any,
        keywords: data.keywords as any,
        source: 'user',
        createdBy: userId,
      },
    });
  }
}
