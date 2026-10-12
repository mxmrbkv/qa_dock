import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TestResultStatus } from '@prisma/client';

export class AutomationTestCaseResultDto {
  @IsOptional()
  @IsString()
  automationId?: string; // e.g., 'tests.auth.test_login' or 'LoginTest#testValidLogin'

  @IsOptional()
  @IsString()
  name?: string; // Test title/name fallback

  @IsEnum(TestResultStatus)
  status: TestResultStatus; // PASSED | FAILED | SKIPPED | BLOCKED

  @IsOptional()
  @IsNumber()
  duration?: number; // In seconds (e.g. 1.25)

  @IsOptional()
  @IsString()
  error?: string; // Error stack trace or assertion message

  @IsOptional()
  @IsString()
  actualResult?: string;
}

export class AutomationJsonPayloadDto {
  @IsOptional()
  @IsString()
  title?: string; // e.g. "Playwright E2E - Build #145"

  @IsOptional()
  @IsString()
  environment?: string; // e.g. "staging", "ci/github-actions"

  @IsOptional()
  @IsString()
  testPlanId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutomationTestCaseResultDto)
  results?: AutomationTestCaseResultDto[];

  @IsOptional()
  @IsString()
  xmlData?: string; // Raw JUnit XML string if sending within JSON wrapper
}
