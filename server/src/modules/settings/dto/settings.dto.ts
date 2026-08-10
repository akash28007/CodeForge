import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['dark', 'light'])
  theme?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(24)
  editorFontSize?: number;

  @IsOptional()
  @IsIn(['cpp'])
  editorLanguage?: string;

  @IsOptional()
  @IsBoolean()
  notifyVerdicts?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyBadges?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyStreaks?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyAnnouncements?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class DeleteAccountDto {
  /** Re-authentication: deleting an account must never be possible from a stolen tab alone. */
  @IsString()
  password!: string;
}
