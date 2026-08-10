import { Role, SubmissionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  NotEquals,
} from 'class-validator';

export class QueryUsersDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  /** `true` returns only suspended accounts, `false` only active ones. */
  @IsOptional() @Type(() => Boolean) @IsBoolean() suspended?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class UpdateUserRoleDto {
  @IsEnum(Role) role!: Role;
}

export class UpdateSuspensionDto {
  @IsBoolean() suspended!: boolean;
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class AdjustXpDto {
  /**
   * Signed delta. Zero is rejected — an adjustment that changes nothing is almost
   * always a mistake, and it would still write a ledger row.
   */
  @Type(() => Number)
  @IsInt()
  @Min(-100000)
  @Max(100000)
  @NotEquals(0)
  amount!: number;

  @IsString() @IsNotEmpty() @MaxLength(300) reason!: string;
}

export class QueryAdminSubmissionsDto {
  @IsOptional() @IsEnum(SubmissionStatus) status?: SubmissionStatus;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}

export class UpdateGamificationConfigDto {
  /**
   * Sparse key/value patch, e.g. `{ "xp.solve.HARD": "60", "level.5.name": "Ace" }`.
   * Keys are validated against the known set in the service — an unknown key is
   * rejected rather than silently stored where nothing will ever read it.
   */
  @IsNotEmpty()
  entries!: Record<string, string>;
}
