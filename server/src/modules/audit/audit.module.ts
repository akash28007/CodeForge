import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

// Global so every admin-facing module can log a mutation without re-importing this
// one. Nothing here is exposed publicly — there is no controller.
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
