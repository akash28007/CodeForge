import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesAdminController } from './resources-admin.controller';
import { ResourcesService } from './resources.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ResourcesController, ResourcesAdminController],
  providers: [ResourcesService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
