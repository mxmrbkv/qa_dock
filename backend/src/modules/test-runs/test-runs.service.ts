import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestRunDto, UpdateTestResultDto } from './dto/create-test-run.dto';
import { TestResultStatus, TestRunStatus } from '@prisma/client';

@Injectable()
export class TestRunsService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, userId: string, dto: CreateTestRunDto) {
    let caseIds = dto.testCaseIds || [];

    // If testPlanId is provided, pull all test cases from that test plan
    if (dto.testPlanId) {
      const plan = await this.prisma.testPlan.findFirst({
        where: { id: dto.testPlanId, projectId },
        include: { testCases: { select: { id: true } } },
      });
      if (plan && plan.testCases.length > 0) {
        caseIds = Array.from(new Set([...caseIds, ...plan.testCases.map((c) => c.id)]));
      }
    }

    if (caseIds.length === 0) {
      throw new BadRequestException('Test run must include at least one test case or a valid test plan');
    }

    return this.prisma.testRun.create({
      data: {
        projectId,
        title: dto.title,
        environment: dto.environment || 'Default',
        testPlanId: dto.testPlanId || null,
        createdById: userId || null,
        status: TestRunStatus.IN_PROGRESS,
        testResults: {
          create: caseIds.map((testCaseId) => ({
            testCaseId,
            status: TestResultStatus.BLOCKED, // initial state before execution
          })),
        },
      },
      include: {
        testResults: {
          include: {
            testCase: {
              include: {
                steps: { orderBy: { stepOrder: 'asc' } },
                tags: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(projectId: string) {
    const runs = await this.prisma.testRun.findMany({
      where: { projectId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        testPlan: { select: { id: true, title: true } },
        testResults: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return runs.map((run) => {
      const total = run.testResults.length;
      const passed = run.testResults.filter((r) => r.status === 'PASSED').length;
      const failed = run.testResults.filter((r) => r.status === 'FAILED').length;
      const skipped = run.testResults.filter((r) => r.status === 'SKIPPED').length;
      const blocked = run.testResults.filter((r) => r.status === 'BLOCKED').length;

      return {
        ...run,
        stats: {
          total,
          passed,
          failed,
          skipped,
          blocked,
          passRate: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%',
        },
      };
    });
  }

  async findOne(projectId: string, id: string) {
    const run = await this.prisma.testRun.findFirst({
      where: { id, projectId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        testPlan: true,
        testResults: {
          include: {
            testCase: {
              include: {
                steps: { orderBy: { stepOrder: 'asc' } },
                tags: true,
              },
            },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Test run ${id} not found`);
    }

    const total = run.testResults.length;
    const passed = run.testResults.filter((r) => r.status === 'PASSED').length;
    const failed = run.testResults.filter((r) => r.status === 'FAILED').length;
    const skipped = run.testResults.filter((r) => r.status === 'SKIPPED').length;
    const blocked = run.testResults.filter((r) => r.status === 'BLOCKED').length;

    return {
      ...run,
      stats: {
        total,
        passed,
        failed,
        skipped,
        blocked,
        passRate: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%',
      },
    };
  }

  async updateResult(projectId: string, runId: string, resultId: string, dto: UpdateTestResultDto) {
    await this.findOne(projectId, runId);

    const updated = await this.prisma.testResult.update({
      where: { id: resultId },
      data: {
        status: dto.status,
        actualResult: dto.actualResult,
        errorLogs: dto.errorLogs,
        executionTime: dto.executionTime,
      },
      include: {
        testCase: {
          include: {
            steps: { orderBy: { stepOrder: 'asc' } },
            tags: true,
          },
        },
      },
    });

    // Check if all results are executed, update testRun status to COMPLETED
    const remaining = await this.prisma.testResult.count({
      where: { testRunId: runId, status: TestResultStatus.BLOCKED },
    });

    if (remaining === 0) {
      await this.prisma.testRun.update({
        where: { id: runId },
        data: { status: TestRunStatus.COMPLETED },
      });
    }

    return updated;
  }
}
