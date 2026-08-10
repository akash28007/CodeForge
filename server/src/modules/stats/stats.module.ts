import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { AnalyticsService } from './analytics.service';
import { ProfileService } from './profile.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [StatsController],
  providers: [StatsService, AnalyticsService, ProfileService],
  exports: [StatsService, AnalyticsService],
})
export class StatsModule {}
