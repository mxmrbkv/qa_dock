import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTestCaseDto } from './dto/create-test-case.dto';
import { UpdateTestCaseDto } from './dto/update-test-case.dto';
import { BulkActionDto, FilterTestCaseDto } from './dto/filter-test-case.dto';

@Injectable()
export class TestCasesService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, dto: CreateTestCaseDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    const { steps, tagIds, ...caseData } = dto;

    return this.prisma.testCase.create({
      data: {
        ...caseData,
        projectId,
        tags: tagIds && tagIds.length > 0
          ? { connect: tagIds.map((id) => ({ id })) }
          : undefined,
        steps: steps && steps.length > 0
          ? {
              create: steps.map((step, idx) => ({
                action: step.action,
                expectedResult: step.expectedResult,
                stepOrder: step.stepOrder !== undefined ? step.stepOrder : idx,
                sharedTestCaseId: step.sharedTestCaseId || null,
              })),
            }
          : undefined,
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            sharedTestCase: {
              select: {
                id: true,
                title: true,
                preConditions: true,
                steps: {
                  orderBy: { stepOrder: 'asc' },
                },
              },
            },
          },
        },
        tags: true,
      },
    });
  }

  async findAll(projectId: string, filter: FilterTestCaseDto) {
    const where: Prisma.TestCaseWhereInput = {
      projectId,
    };

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { automationId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.priority) {
      where.priority = filter.priority;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.isAutomated !== undefined) {
      where.isAutomated = filter.isAutomated === 'true';
    }

    if (filter.isShared !== undefined) {
      where.isShared = filter.isShared === 'true';
    }

    if (filter.tagId) {
      where.tags = {
        some: { id: filter.tagId },
      };
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const validSortFields = ['title', 'priority', 'status', 'createdAt', 'updatedAt', 'isAutomated', 'isShared'];
    const sortBy = validSortFields.includes(filter.sortBy) ? filter.sortBy : 'createdAt';
    const sortOrder = (filter.sortOrder?.toLowerCase() === 'asc') ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.testCase.findMany({
        where,
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              sharedTestCase: {
                select: {
                  id: true,
                  title: true,
                  preConditions: true,
                  steps: {
                    orderBy: { stepOrder: 'asc' },
                  },
                },
              },
            },
          },
          tags: true,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.testCase.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(projectId: string, id: string) {
    const testCase = await this.prisma.testCase.findFirst({
      where: { id, projectId },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          include: {
            sharedTestCase: {
              select: {
                id: true,
                title: true,
                preConditions: true,
                steps: {
                  orderBy: { stepOrder: 'asc' },
                },
              },
            },
          },
        },
        tags: true,
        project: {
          select: { id: true, name: true, key: true },
        },
        testResults: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            testRun: {
              select: { id: true, title: true, environment: true, createdAt: true },
            },
          },
        },
      },
    });

    if (!testCase) {
      throw new NotFoundException(`Test case with ID ${id} not found in project ${projectId}`);
    }

    return testCase;
  }

  async update(projectId: string, id: string, dto: UpdateTestCaseDto) {
    await this.findOne(projectId, id);

    const { steps, tagIds, ...caseData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // If steps are provided, replace all existing steps with the new ordered set
      if (steps !== undefined) {
        await tx.testStep.deleteMany({
          where: { testCaseId: id },
        });

        if (steps.length > 0) {
          await tx.testStep.createMany({
            data: steps.map((step, idx) => ({
              testCaseId: id,
              action: step.action,
              expectedResult: step.expectedResult,
              stepOrder: step.stepOrder !== undefined ? step.stepOrder : idx,
              sharedTestCaseId: step.sharedTestCaseId || null,
            })),
          });
        }
      }

      // Handle tags if provided
      let tagsUpdate = undefined;
      if (tagIds !== undefined) {
        tagsUpdate = {
          set: tagIds.map((tagId) => ({ id: tagId })),
        };
      }

      return tx.testCase.update({
        where: { id },
        data: {
          ...caseData,
          tags: tagsUpdate,
        },
        include: {
          steps: {
            orderBy: { stepOrder: 'asc' },
            include: {
              sharedTestCase: {
                select: {
                  id: true,
                  title: true,
                  preConditions: true,
                  steps: {
                    orderBy: { stepOrder: 'asc' },
                  },
                },
              },
            },
          },
          tags: true,
        },
      });
    });
  }

  async remove(projectId: string, id: string) {
    await this.findOne(projectId, id);
    return this.prisma.testCase.delete({
      where: { id },
    });
  }

  async bulkAction(projectId: string, dto: BulkActionDto) {
    const { caseIds, action, priority, status, tagId } = dto;

    if (!caseIds || caseIds.length === 0) {
      throw new BadRequestException('caseIds array cannot be empty');
    }

    // Verify all test cases belong to project
    const count = await this.prisma.testCase.count({
      where: { id: { in: caseIds }, projectId },
    });

    if (count !== caseIds.length) {
      throw new BadRequestException('One or more test cases do not belong to this project');
    }

    switch (action) {
      case 'DELETE':
        return this.prisma.testCase.deleteMany({
          where: { id: { in: caseIds }, projectId },
        });

      case 'SET_PRIORITY':
        if (!priority) throw new BadRequestException('Priority is required for SET_PRIORITY');
        return this.prisma.testCase.updateMany({
          where: { id: { in: caseIds }, projectId },
          data: { priority },
        });

      case 'SET_STATUS':
        if (!status) throw new BadRequestException('Status is required for SET_STATUS');
        return this.prisma.testCase.updateMany({
          where: { id: { in: caseIds }, projectId },
          data: { status },
        });

      case 'ADD_TAG':
        if (!tagId) throw new BadRequestException('tagId is required for ADD_TAG');
        await Promise.all(
          caseIds.map((id) =>
            this.prisma.testCase.update({
              where: { id },
              data: {
                tags: { connect: { id: tagId } },
              },
            }),
          ),
        );
        return { success: true, count: caseIds.length };

      case 'REMOVE_TAG':
        if (!tagId) throw new BadRequestException('tagId is required for REMOVE_TAG');
        await Promise.all(
          caseIds.map((id) =>
            this.prisma.testCase.update({
              where: { id },
              data: {
                tags: { disconnect: { id: tagId } },
              },
            }),
          ),
        );
        return { success: true, count: caseIds.length };

      default:
        throw new BadRequestException(`Unknown bulk action: ${action}`);
    }
  }
}
