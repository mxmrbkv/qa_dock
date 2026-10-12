import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Tag "${dto.name}" already exists in this project`);
    }

    return this.prisma.tag.create({
      data: {
        projectId,
        name: dto.name.trim(),
        color: dto.color || '#3B82F6',
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.tag.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async remove(projectId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, projectId },
    });

    if (!tag) {
      throw new NotFoundException(`Tag ${id} not found`);
    }

    return this.prisma.tag.delete({
      where: { id },
    });
  }
}
