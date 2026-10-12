import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateProjectDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  name: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Key must be uppercase alphanumeric (e.g. QAD, PRJ-1)',
  })
  key: string;

  @IsOptional()
  @IsString()
  description?: string;
}
