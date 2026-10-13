import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTestSuiteDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
