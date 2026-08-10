import { IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { USERNAME_PATTERN } from '../username.util';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(USERNAME_PATTERN, {
    message: 'Username must be 3-20 characters, using lowercase letters, numbers, or underscores',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;
}
