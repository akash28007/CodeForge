import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProblemsModule } from './modules/problems/problems.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { StatsModule } from './modules/stats/stats.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SettingsModule } from './modules/settings/settings.module';
import { AuditModule } from './modules/audit/audit.module';
import { HomeModule } from './modules/home/home.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    QueueModule,
    AuditModule,
    AuthModule,
    ProblemsModule,
    SubmissionsModule,
    LeaderboardModule,
    StatsModule,
    NotificationsModule,
    GamificationModule,
    SettingsModule,
    HomeModule,
    ResourcesModule,
    UploadsModule,
    AdminModule,
  ],
})
export class AppModule {}
