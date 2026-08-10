import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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

  /** Public profile page. Signed-in viewers bump the owner's view counter. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('u/:username')
  publicProfile(@Param('username') username: string, @CurrentUser() user?: JwtPayload) {
    return this.profile.publicProfile(username, user?.sub);
  }
}
