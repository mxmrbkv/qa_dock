import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TestPlanStatus } from '@prisma/client';

export class CreateTestPlanDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TestPlanStatus)
  status?: TestPlanStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  testCaseIds?: string[];
}
