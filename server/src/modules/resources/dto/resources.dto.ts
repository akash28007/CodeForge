import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ResourceType } from '@prisma/client';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class QueryResourcesDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @IsOptional()
  @IsString()
  search?: string;
}

export class CreateResourceCategoryDto {
  @IsString()
  @Matches(SLUG, { message: 'Slug must be lowercase words separated by hyphens' })
  slug!: string;

  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateResourceCategoryDto {
  @IsOptional()
  @IsString()
  @Matches(SLUG)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class CreateResourceDto {
  @IsString()
  @Matches(SLUG, { message: 'Slug must be lowercase words separated by hyphens' })
  slug!: string;

  @IsString()
  @MaxLength(140)
  title!: string;

  @IsString()
  @MaxLength(400)
  description!: string;

  @IsEnum(ResourceType)
  type!: ResourceType;

  @IsString()
  categoryId!: string;

  /** Exactly one of `url` or `body` is required — checked in the service. */
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  @Matches(SLUG)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsEnum(ResourceType)
  type?: ResourceType;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  url?: string | null;

  @IsOptional()
  @IsString()
  body?: string | null;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class LearningPathStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  problemId?: string;
}

export class CreateLearningPathDto {
  @IsString()
  @Matches(SLUG)
  slug!: string;

  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(400)
  description!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPathStepDto)
  steps?: LearningPathStepDto[];
}

export class UpdateLearningPathDto {
  @IsOptional()
  @IsString()
  @Matches(SLUG)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  accent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LearningPathStepDto)
  steps?: LearningPathStepDto[];
}

export class SetStepCompletionDto {
  @IsBoolean()
  completed!: boolean;
}
