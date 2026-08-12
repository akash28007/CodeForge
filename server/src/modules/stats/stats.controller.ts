import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { MAX_UPLOAD_BYTES, type UploadedImage } from '../uploads/uploads.service';
import { StatsService } from './stats.service';
import { AnalyticsService, type TimeRange } from './analytics.service';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

const RANGES: TimeRange[] = ['week', 'month', 'year', 'all'];

@Controller()
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly analytics: AnalyticsService,
    private readonly profile: ProfileService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/activity')
  activity(@CurrentUser() user: JwtPayload, @Query('days', new DefaultValuePipe('365')) days: string) {
    const parsed = Number(days);
    const bounded = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 366) : 365;
    return this.statsService.activity(user.sub, bounded);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/progress')
  progress(@CurrentUser() user: JwtPayload) {
    return this.statsService.progress(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/analytics')
  analyticsOverview(@CurrentUser() user: JwtPayload, @Query('range', new DefaultValuePipe('all')) range: string) {
    const selected = RANGES.includes(range as TimeRange) ? (range as TimeRange) : 'all';
    return this.analytics.overview(user.sub, selected);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile-card')
  profileCard(@CurrentUser() user: JwtPayload) {
    return this.profile.profileCard(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.profile.updateProfile(user.sub, dto);
  }

  /**
   * Avatar upload. Separate from `PATCH /profile` on purpose: the column holds a path
   * this server generated, so there is deliberately no way to *set* it to an arbitrary
   * string — only to upload an image or clear it.
   */
  @UseGuards(JwtAuthGuard)
  @Post('profile/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload your profile picture (PNG/JPEG/GIF/WebP, max 2 MB)' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      // Memory storage: a file that fails validation never touches the disk.
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file: UploadedImage) {
    return this.profile.setAvatar(user.sub, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile/avatar')
  @ApiOperation({ summary: 'Remove your profile picture and fall back to initials' })
  removeAvatar(@CurrentUser() user: JwtPayload) {
    return this.profile.removeAvatar(user.sub);
  }

  /** Public profile page. Signed-in viewers bump the owner's view counter. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('u/:username')
  publicProfile(@Param('username') username: string, @CurrentUser() user?: JwtPayload) {
    return this.profile.publicProfile(username, user?.sub);
  }
}
