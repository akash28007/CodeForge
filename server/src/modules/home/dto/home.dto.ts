import { FooterColumn, ReviewStatus, SocialPlatform } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Every field on the singleton is optional so the admin panel can PATCH one
 * section at a time (hero copy, contact block, footer blurb) without resending
 * the rest of the page.
 */
export class UpdateHomeContentDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(160) heroHeadline?: string;
  @IsOptional() @IsString() @MaxLength(60) heroHighlight?: string;
  @IsOptional() @IsString() @MaxLength(400) heroSubtext?: string;
  @IsOptional() @IsString() @MaxLength(500) heroImageUrl?: string | null;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40) ctaPrimaryLabel?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) ctaPrimaryHref?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40) ctaSecondaryLabel?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) ctaSecondaryHref?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40) ctaTertiaryLabel?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) ctaTertiaryHref?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) coursesHeading?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) coursesViewAllHref?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) reviewsHeading?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) reviewsViewAllHref?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) statsHeading?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) howHeading?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) howStep1Title?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) howStep1Body?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) howStep2Title?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) howStep2Body?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) howStep3Title?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) howStep3Body?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) topicsHeading?: string;

  @IsOptional() @IsString() @MaxLength(160) marqueeCaption?: string;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) contactHeading?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(160) contactEmail?: string;

  @IsOptional() @IsString() @MaxLength(400) footerTagline?: string;
  @IsOptional() @IsString() @MaxLength(120) newsletterHeading?: string;
  @IsOptional() @IsString() @MaxLength(400) newsletterBody?: string;
  @IsOptional() @IsString() @MaxLength(200) copyrightText?: string;
}

export class CreateCourseCardDto {
  @IsString() @IsNotEmpty() @MaxLength(80) title!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) description!: string;
  @IsString() @IsNotEmpty() @MaxLength(40) metaLabel!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) href!: string;
  @IsOptional() @IsString() @MaxLength(40) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) accent?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateCourseCardDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) title?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) description?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(40) metaLabel?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) href?: string;
  @IsOptional() @IsString() @MaxLength(40) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) accent?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CreateReviewDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name!: string;
  @IsOptional() @IsString() @MaxLength(80) designation?: string | null;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsString() @IsNotEmpty() @MaxLength(600) body!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateReviewDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(80) designation?: string | null;
  @IsOptional() @IsString() @MaxLength(500) avatarUrl?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5) rating?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(600) body?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @IsEnum(ReviewStatus) status?: ReviewStatus;
}

/**
 * What a signed-in user may write. Deliberately narrower than the admin DTO: no `name`,
 * `avatarUrl`, `published` or `status` — identity comes from the account and visibility
 * is a moderation decision, so neither is the submitter's to set.
 */
export class SubmitReviewDto {
  @IsOptional() @IsString() @MaxLength(80) designation?: string | null;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsString() @IsNotEmpty() @MaxLength(600) body!: string;
}

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() @MaxLength(60) name!: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateCompanyDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) name?: string;
  @IsOptional() @IsString() @MaxLength(500) logoUrl?: string | null;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpsertSocialLinkDto {
  @IsEnum(SocialPlatform) platform!: SocialPlatform;
  @IsString() @IsNotEmpty() @MaxLength(300) url!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class CreateFooterLinkDto {
  @IsEnum(FooterColumn) section!: FooterColumn;
  @IsString() @IsNotEmpty() @MaxLength(60) label!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) href!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateFooterLinkDto {
  @IsOptional() @IsEnum(FooterColumn) section?: FooterColumn;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) label?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) href?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class SubscribeDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(160)
  email!: string;
}
