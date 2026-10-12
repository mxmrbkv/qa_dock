import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 10)
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'Key must be uppercase alphanumeric (e.g. QAD, PRJ-1)',
  })
  key?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
