import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { JudgeProcessor } from './judge.processor';
import { DockerModule } from '../../docker/docker.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'judge' }), DockerModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, JudgeProcessor],
})
export class SubmissionsModule {}
