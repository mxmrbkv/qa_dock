import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';

@Injectable()
export class TestSuitesService {
  constructor(private prisma: PrismaService) {}

  async findAll(projectId: string) {
    const suites = await this.prisma.testSuite.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Also get count of test cases without any suite
    const unassignedCount = await this.prisma.testCase.count({
      where: {
        projectId,
        suiteId: null,
      },
    });

    const totalCount = await this.prisma.testCase.count({
      where: { projectId },
    });

    return {
      suites,
      counts: {
        total: totalCount,
        unassigned: unassignedCount,
      },
    };
  }

  async findOne(projectId: string, id: string) {
    const suite = await this.prisma.testSuite.findFirst({
      where: { id, projectId },
      include: {
        _count: {
          select: { testCases: true },
        },
        children: {
          include: {
            _count: {
              select: { testCases: true },
            },
          },
        },
      },
    });

    if (!suite) {
      throw new NotFoundException(`Test suite ${id} not found in project ${projectId}`);
    }

    return suite;
  }

  async create(projectId: string, dto: CreateTestSuiteDto) {
    return this.prisma.testSuite.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        parentId: dto.parentId || null,
        projectId,
      },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
    });
  }

  async update(projectId: string, id: string, dto: UpdateTestSuiteDto) {
    await this.findOne(projectId, id);

    return this.prisma.testSuite.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
        parentId: dto.parentId !== undefined ? dto.parentId || null : undefined,
      },
      include: {
        _count: {
          select: { testCases: true },
        },
      },
    });
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);

    // Unassign test cases from this suite
    await this.prisma.testCase.updateMany({
      where: { suiteId: id, projectId },
      data: { suiteId: null },
    });

    return this.prisma.testSuite.delete({
      where: { id },
    });
  }
}
