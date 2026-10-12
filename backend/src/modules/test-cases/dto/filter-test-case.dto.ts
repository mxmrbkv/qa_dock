import { IsArray, IsBooleanString, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Priority, TestCaseStatus } from '@prisma/client';

export class FilterTestCaseDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsOptional()
  @IsBooleanString()
  isAutomated?: string;

  @IsOptional()
  @IsString()
  tagId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc', 'ASC', 'DESC'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class BulkActionDto {
  @IsArray()
  @IsString({ each: true })
  caseIds: string[];

  @IsString()
  @IsIn(['DELETE', 'SET_PRIORITY', 'SET_STATUS', 'ADD_TAG', 'REMOVE_TAG'])
  action: 'DELETE' | 'SET_PRIORITY' | 'SET_STATUS' | 'ADD_TAG' | 'REMOVE_TAG';

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsEnum(TestCaseStatus)
  status?: TestCaseStatus;

  @IsOptional()
  @IsString()
  tagId?: string;
}
