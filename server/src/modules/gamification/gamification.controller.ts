import { Controller, Get, UseGuards } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamification: GamificationService) {}

  /** Level, XP, streak and badges. Also performs the once-a-day check-in. */
  @Get('gamification')
  summary(@CurrentUser() user: JwtPayload) {
    return this.gamification.summary(user.sub);
  }

  @Get('skills')
  skills(@CurrentUser() user: JwtPayload) {
    return this.gamification.skillXp(user.sub);
  }

  @Get('xp-history')
  history(@CurrentUser() user: JwtPayload) {
    return this.gamification.history(user.sub);
  }
}
