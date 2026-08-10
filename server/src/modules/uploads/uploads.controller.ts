import {
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MAX_UPLOAD_BYTES, UploadsService, type UploadedImage } from './uploads.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../utils/roles.decorator';
import { CurrentUser } from '../../utils/current-user.decorator';
import { JwtPayload } from '../../types/jwt-payload.interface';

/**
 * Image uploads for admin-managed content (hero art, company logos, resource
 * thumbnails). Admin-only: every consumer of these images is admin-authored content,
 * so there is no reason to expose an upload endpoint to ordinary accounts.
 */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly audit: AuditService,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a PNG/JPEG/GIF/WebP image (max 2 MB)' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      // Memory storage, deliberately: multer never writes anything, so a file that
      // fails validation never touches the filesystem at all. The service writes the
      // buffer itself, under a name it generates.
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async upload(@CurrentUser() user: JwtPayload, @UploadedFile() file: UploadedImage) {
    const stored = await this.uploads.storeImage(file);
    await this.audit.record({
      actorId: user.sub,
      action: 'upload',
      entity: 'Image',
      entityId: stored.url,
      summary: `Uploaded ${stored.format} image (${Math.round(stored.bytes / 1024)} KB)`,
    });
    return stored;
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete a previously uploaded image' })
  async remove(@CurrentUser() user: JwtPayload, @Param('filename') filename: string) {
    await this.uploads.removeImage(filename);
    await this.audit.record({
      actorId: user.sub,
      action: 'delete',
      entity: 'Image',
      entityId: filename,
      summary: `Deleted uploaded image ${filename}`,
    });
    return { ok: true };
  }
}
