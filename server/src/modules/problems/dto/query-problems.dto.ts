import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Difficulty } from '@prisma/client';

export const PROBLEM_SORT_FIELDS = ['recent', 'title', 'difficulty', 'acceptance', 'solves'] as const;
export type ProblemSortField = (typeof PROBLEM_SORT_FIELDS)[number];

export const PROBLEM_STATUS = ['solved', 'unsolved', 'bookmarked'] as const;
export type ProblemStatusFilter = (typeof PROBLEM_STATUS)[number];

/** Accepts both `?tags=a&tags=b` and `?tags=a,b`. */
function toStringArray({ value }: { value: unknown }): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const cleaned = raw.map((v) => String(v).trim()).filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export class QueryProblemsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsEnum(Difficulty, { each: true })
  difficulty?: Difficulty[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(PROBLEM_STATUS, { each: true })
  status?: ProblemStatusFilter[];

  @IsOptional()
  @IsIn(PROBLEM_SORT_FIELDS)
  sort?: ProblemSortField = 'recent';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

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
