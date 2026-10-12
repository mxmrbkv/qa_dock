import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const existingKey = await this.prisma.project.findUnique({
      where: { key: dto.key.toUpperCase() },
    });

    if (existingKey) {
      throw new ConflictException(`Project key "${dto.key}" already exists`);
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        key: dto.key.toUpperCase(),
        description: dto.description,
        members: {
          create: {
            userId,
            role: Role.ADMIN,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            testCases: true,
            testPlans: true,
            testRuns: true,
          },
        },
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            testCases: true,
            testPlans: true,
            testRuns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        tags: true,
        _count: {
          select: {
            testCases: true,
            testPlans: true,
            testRuns: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);

    if (dto.key) {
      const existingKey = await this.prisma.project.findUnique({
        where: { key: dto.key.toUpperCase() },
      });
      if (existingKey && existingKey.id !== id) {
        throw new ConflictException(`Project key "${dto.key}" already exists`);
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        key: dto.key ? dto.key.toUpperCase() : undefined,
        description: dto.description,
      },
      include: {
        _count: {
          select: {
            testCases: true,
            testPlans: true,
            testRuns: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.project.delete({
      where: { id },
    });
  }

  async getMembers(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async addMember(projectId: string, userEmail: string, role: Role = Role.QA_ENGINEER) {
    await this.findOne(projectId);

    const user = await this.prisma.user.findUnique({
      where: { email: userEmail.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException(`User with email "${userEmail}" not found`);
    }

    return this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
      update: { role },
      create: {
        projectId,
        userId: user.id,
        role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    return this.prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });
  }
}
