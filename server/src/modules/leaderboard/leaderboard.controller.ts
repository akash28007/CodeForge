import { Controller, DefaultValuePipe, Get, Query, UseGuards } from '@nestjs/common';
import { LeaderboardService, type LeaderboardPeriod } from './leaderboard.service';
import { OptionalJwtAuthGuard } from '../../guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

const PERIODS: LeaderboardPeriod[] = ['all', 'month', 'week'];

@Controller()
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /** Public, but pins the caller's own row when a token is supplied. */
  @UseGuards(OptionalJwtAuthGuard)
  @Get('leaderboard')
  getLeaderboard(
    @Query('period', new DefaultValuePipe('all')) period: string,
    @Query('page', new DefaultValuePipe('1')) page: string,
    @Query('pageSize', new DefaultValuePipe('25')) pageSize: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.leaderboardService.getLeaderboard(
      {
        period: PERIODS.includes(period as LeaderboardPeriod) ? (period as LeaderboardPeriod) : 'all',
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 25,
      },
      user?.sub,
    );
  }

  @Get('leaderboard/levels')
  levelDistribution() {
    return this.leaderboardService.levelDistribution();
  }
}
