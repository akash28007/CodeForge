import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  // For GamificationConfigService — editing config must go through the same service
  // that caches it, so an admin edit invalidates the cache immediately.
  imports: [GamificationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
