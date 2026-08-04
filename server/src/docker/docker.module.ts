import { Module } from '@nestjs/common';
import { DockerExecutorService } from './docker-executor.service';

@Module({
  providers: [DockerExecutorService],
  exports: [DockerExecutorService],
})
export class DockerModule {}
