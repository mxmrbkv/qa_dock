import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestPlanDto } from './dto/create-test-plan.dto';
import { UpdateTestPlanDto } from './dto/update-test-plan.dto';

@Injectable()
export class TestPlansService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTestPlanDto) {
    const { testCaseIds, ...planData } = dto;

    return this.prisma.testPlan.create({
      data: {
        ...planData,
        projectId,
        testCases: testCaseIds && testCaseIds.length > 0
          ? { connect: testCaseIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        testCases: {
          include: {
            tags: true,
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        _count: {
          select: { testCases: true, testRuns: true },
        },
      },
    });
  }

  async findAll(projectId: string) {
    return this.prisma.testPlan.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { testCases: true, testRuns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(projectId: string, id: string) {
    const plan = await this.prisma.testPlan.findFirst({
      where: { id, projectId },
      include: {
        testCases: {
          include: {
            tags: true,
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
        testRuns: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { testResults: true },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Test Plan ${id} not found`);
    }

    return plan;
  }

  async update(projectId: string, id: string, dto: UpdateTestPlanDto) {
    await this.findOne(projectId, id);

    const { testCaseIds, ...planData } = dto;

    return this.prisma.testPlan.update({
      where: { id },
      data: {
        ...planData,
        testCases: testCaseIds !== undefined
          ? { set: testCaseIds.map((cId) => ({ id: cId })) }
          : undefined,
      },
      include: {
        testCases: {
          include: { tags: true },
        },
      },
    });
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);
    return this.prisma.testPlan.delete({
      where: { id },
    });
  }
}
