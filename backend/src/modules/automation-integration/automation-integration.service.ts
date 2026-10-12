import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AutomationJsonPayloadDto,
  AutomationTestCaseResultDto,
} from './dto/automation-json-payload.dto';
import { TestResultStatus, TestRunStatus, Priority, TestCaseStatus } from '@prisma/client';

export interface ParsedItem {
  automationId?: string;
  name: string;
  status: TestResultStatus;
  duration?: number;
  error?: string;
  actualResult?: string;
}

@Injectable()
export class AutomationIntegrationService {
  private readonly logger = new Logger(AutomationIntegrationService.name);
  private xmlParser: XMLParser;

  constructor(private prisma: PrismaService) {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      allowBooleanAttributes: true,
      parseAttributeValue: true,
    });
  }

  async processResults(
    projectId: string,
    body: any,
    contentType: string = 'application/json',
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    let parsedResults: ParsedItem[] = [];
    let runTitle = `Automated Run - ${new Date().toISOString()}`;
    let environment = 'ci-pipeline';
    let testPlanId: string | undefined = undefined;

    // 1. Detect if content is raw XML string, JSON containing xmlData / xmlContent, or pure JSON
    if (typeof body === 'string' || contentType.includes('xml')) {
      const xmlString = typeof body === 'string' ? body : JSON.stringify(body);
      parsedResults = this.parseJUnitXml(xmlString);
    } else if (body.xmlData || body.xmlContent) {
      parsedResults = this.parseJUnitXml(body.xmlData || body.xmlContent);
      if (body.title || body.runName) runTitle = body.title || body.runName;
      if (body.environment) environment = body.environment;
      testPlanId = body.testPlanId;
    } else if (Array.isArray(body.results) || body.results) {
      const payload = body as AutomationJsonPayloadDto;
      if (payload.title) runTitle = payload.title;
      if (payload.environment) environment = payload.environment;
      testPlanId = payload.testPlanId;

      parsedResults = (payload.results || []).map((r) => ({
        automationId: r.automationId,
        name: r.name || r.automationId || 'Unnamed Autotest',
        status: r.status || TestResultStatus.PASSED,
        duration: r.duration,
        error: r.error,
        actualResult: r.actualResult,
      }));
    } else if (Array.isArray(body)) {
      parsedResults = body.map((r) => ({
        automationId: r.automationId,
        name: r.name || r.automationId || 'Unnamed Autotest',
        status: r.status || TestResultStatus.PASSED,
        duration: r.duration,
        error: r.error,
        actualResult: r.actualResult,
      }));
    } else {
      throw new BadRequestException(
        'Invalid payload format. Expected JSON with { results: [...] } or JUnit XML.',
      );
    }

    if (parsedResults.length === 0) {
      throw new BadRequestException('No test results found in payload');
    }

    // 2. Validate optional testPlanId
    if (testPlanId) {
      const plan = await this.prisma.testPlan.findFirst({
        where: { id: testPlanId, projectId },
      });
      if (!plan) {
        testPlanId = undefined; // Graceful fallback
      }
    }

    // 3. Process each result: match or create TestCase
    let matchedCount = 0;
    let createdCount = 0;
    const testCaseResultPairs: {
      testCaseId: string;
      status: TestResultStatus;
      duration?: number;
      error?: string;
      actualResult?: string;
    }[] = [];

    for (const item of parsedResults) {
      let testCase = null;

      // Strategy A: Match by unique automationId within the project
      if (item.automationId) {
        testCase = await this.prisma.testCase.findFirst({
          where: {
            projectId,
            automationId: item.automationId,
          },
        });
      }

      // Strategy B: Match by test title/name if not found by automationId
      if (!testCase && item.name) {
        testCase = await this.prisma.testCase.findFirst({
          where: {
            projectId,
            title: {
              equals: item.name,
              mode: 'insensitive',
            },
          },
        });
      }

      // Strategy C: Auto-provision new test case if not existing
      if (!testCase) {
        testCase = await this.prisma.testCase.create({
          data: {
            projectId,
            title: item.name || item.automationId || 'Automated Test',
            automationId: item.automationId || null,
            isAutomated: true,
            status: TestCaseStatus.ACTIVE,
            priority: Priority.MEDIUM,
            description: `Auto-registered via CI/CD Webhook for test: ${item.name}`,
          },
        });
        createdCount++;
      } else {
        matchedCount++;
        // If it wasn't marked as automated, update it
        if (!testCase.isAutomated || (item.automationId && !testCase.automationId)) {
          await this.prisma.testCase.update({
            where: { id: testCase.id },
            data: {
              isAutomated: true,
              automationId: testCase.automationId || item.automationId,
            },
          });
        }
      }

      testCaseResultPairs.push({
        testCaseId: testCase.id,
        status: item.status,
        duration: item.duration,
        error: item.error,
        actualResult: item.actualResult || (item.status === 'PASSED' ? 'Passed successfully' : item.error),
      });
    }

    // 4. Determine overall TestRun status
    const hasFailures = testCaseResultPairs.some((r) => r.status === TestResultStatus.FAILED);
    const runStatus: TestRunStatus = TestRunStatus.COMPLETED;

    // 5. Create TestRun and associated TestResults in transaction
    const testRun = await this.prisma.testRun.create({
      data: {
        projectId,
        title: runTitle,
        environment,
        testPlanId: testPlanId || null,
        status: runStatus,
        testResults: {
          create: testCaseResultPairs.map((r) => ({
            testCaseId: r.testCaseId,
            status: r.status,
            executionTime: r.duration,
            errorLogs: r.error,
            actualResult: r.actualResult,
          })),
        },
      },
      include: {
        testResults: {
          include: {
            testCase: {
              select: { id: true, title: true, automationId: true, priority: true },
            },
          },
        },
      },
    });

    // 6. Summary metrics
    const total = testCaseResultPairs.length;
    const passed = testCaseResultPairs.filter((r) => r.status === TestResultStatus.PASSED).length;
    const failed = testCaseResultPairs.filter((r) => r.status === TestResultStatus.FAILED).length;
    const skipped = testCaseResultPairs.filter((r) => r.status === TestResultStatus.SKIPPED).length;
    const blocked = testCaseResultPairs.filter((r) => r.status === TestResultStatus.BLOCKED).length;
    const totalDuration = testCaseResultPairs.reduce((acc, curr) => acc + (curr.duration || 0), 0);

    return {
      success: true,
      message: 'Automation results processed successfully',
      data: {
        testRunId: testRun.id,
        title: testRun.title,
        environment: testRun.environment,
        createdAt: testRun.createdAt,
        summary: {
          total,
          passed,
          failed,
          skipped,
          blocked,
          passRate: total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%',
          totalDurationSeconds: Number(totalDuration.toFixed(2)),
          matchedCasesCount: matchedCount,
          autoCreatedCasesCount: createdCount,
        },
      },
    };
  }

  private parseJUnitXml(xmlString: string): ParsedItem[] {
    try {
      const parsed = this.xmlParser.parse(xmlString);
      const items: ParsedItem[] = [];

      const extractTestCase = (tc: any, suiteName: string = '') => {
        const name = tc['@_name'] || 'Unnamed Test';
        const classname = tc['@_classname'] || suiteName || '';
        const time = parseFloat(tc['@_time']) || 0;
        const automationId = classname ? `${classname}.${name}` : name;

        let status: TestResultStatus = TestResultStatus.PASSED;
        let error: string | undefined = undefined;

        if (tc.failure) {
          status = TestResultStatus.FAILED;
          error = typeof tc.failure === 'object'
            ? tc.failure['#text'] || tc.failure['@_message'] || JSON.stringify(tc.failure)
            : String(tc.failure);
        } else if (tc.error) {
          status = TestResultStatus.FAILED;
          error = typeof tc.error === 'object'
            ? tc.error['#text'] || tc.error['@_message'] || JSON.stringify(tc.error)
            : String(tc.error);
        } else if (tc.skipped !== undefined) {
          status = TestResultStatus.SKIPPED;
          error = typeof tc.skipped === 'object' ? tc.skipped['@_message'] : undefined;
        }

        items.push({
          automationId,
          name,
          status,
          duration: time,
          error,
          actualResult: status === TestResultStatus.PASSED ? 'Test passed' : error,
        });
      };

      const processSuite = (suite: any) => {
        if (!suite) return;
        const suiteName = suite['@_name'] || '';
        if (suite.testcase) {
          if (Array.isArray(suite.testcase)) {
            suite.testcase.forEach((tc) => extractTestCase(tc, suiteName));
          } else {
            extractTestCase(suite.testcase, suiteName);
          }
        }
        if (suite.testsuite) {
          if (Array.isArray(suite.testsuite)) {
            suite.testsuite.forEach(processSuite);
          } else {
            processSuite(suite.testsuite);
          }
        }
      };

      if (parsed.testsuites) {
        if (Array.isArray(parsed.testsuites.testsuite)) {
          parsed.testsuites.testsuite.forEach(processSuite);
        } else if (parsed.testsuites.testsuite) {
          processSuite(parsed.testsuites.testsuite);
        }
      } else if (parsed.testsuite) {
        if (Array.isArray(parsed.testsuite)) {
          parsed.testsuite.forEach(processSuite);
        } else {
          processSuite(parsed.testsuite);
        }
      }

      return items;
    } catch (err) {
      this.logger.error('Failed to parse JUnit XML', err);
      throw new BadRequestException(`Malformed JUnit XML: ${err.message}`);
    }
  }
}
