import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TestResultStatus, TestRunStatus } from '@prisma/client';

export class CreateTestRunDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  testPlanId?: string;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testCaseIds?: string[];
}

export class UpdateTestResultDto {
  @IsEnum(TestResultStatus)
  status: TestResultStatus;

  @IsOptional()
  @IsString()
  actualResult?: string;

  @IsOptional()
  @IsString()
  errorLogs?: string;

  @IsOptional()
  @IsNumber()
  executionTime?: number;
}
