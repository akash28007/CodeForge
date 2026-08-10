import { Transform, Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Difficulty, SubmissionStatus } from '@prisma/client';

function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = raw.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export class QuerySubmissionsDto {
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(SubmissionStatus, { each: true })
  status?: SubmissionStatus[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(Difficulty, { each: true })
  difficulty?: Difficulty[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['recent', 'runtime'])
  sort?: string = 'recent';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
