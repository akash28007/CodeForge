import { Module } from '@nestjs/common';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';
import { GamificationConfigService } from './gamification.config';

@Module({
  controllers: [GamificationController],
  providers: [GamificationService, GamificationConfigService],
  exports: [GamificationService, GamificationConfigService],
})
export class GamificationModule {}
