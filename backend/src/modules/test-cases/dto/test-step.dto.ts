import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class TestStepDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsNotEmpty()
  @IsString()
  action: string;

  @IsNotEmpty()
  @IsString()
  expectedResult: string;

  @IsNotEmpty()
  @IsInt()
  @Min(0)
  stepOrder: number;
}
