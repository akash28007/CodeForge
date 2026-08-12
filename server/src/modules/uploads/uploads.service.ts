import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { isAbsolute, join, resolve } from 'path';
import { trimTransparentPadding } from './png-trim';

/**
 * The shape of a memory-storage multer file. Declared here rather than pulling in
 * `@types/multer`: multer itself already ships inside `@nestjs/platform-express`, and
 * these four fields are all this module touches.
 */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Accepted formats, identified by leading magic bytes.
 *
 * This is an allowlist by *construction*: a file is accepted only if its actual first
 * bytes match one of these signatures. The browser-supplied `mimetype` and the
 * original filename are never consulted, both being attacker-controlled.
 *
 * SVG is therefore excluded automatically and deliberately — it is XML with no fixed
 * signature, and an SVG served from our own origin can carry a <script> tag, which is
 * stored XSS against every admin who views the page.
 */
const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  {
    ext: 'png',
    mime: 'image/png',
    match: (b) => b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    match: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    match: (b) => b.length > 6 && (b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a'),
  },
  {
    // RIFF....WEBP — the size field sits between the two markers.
    ext: 'webp',
    mime: 'image/webp',
    match: (b) =>
      b.length > 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
];

/** Only ever matches names this service generated. */
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|gif|webp)$/;

export const UPLOAD_ROUTE_PREFIX = '/uploads';

/**
 * Resolved once so the controller, the service, and `main.ts` cannot disagree.
 *
 * Both the configured path and the fallback resolve from the process working
 * directory — i.e. the server package root under any of the npm scripts. Deliberately
 * *not* relative to `__dirname`: that points inside `dist/` in a compiled run, and
 * `dist/` is wiped on every rebuild, which would silently delete every uploaded image
 * on deploy.
 */
export function resolveUploadDir(): string {
  const configured = process.env.UPLOAD_DIR;
  const dir = configured
    ? isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured)
    : resolve(process.cwd(), 'uploads');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly dir = resolveUploadDir();

  /**
   * Validates and stores an image, returning the public path.
   *
   * The stored filename is generated here and never derived from the upload. That is
   * what makes path traversal (`../../etc/passwd`) structurally impossible rather than
   * something a sanitiser has to catch, and it also removes any chance of one upload
   * overwriting another.
   */
  async storeImage(file: UploadedImage | undefined): Promise<{ url: string; bytes: number; format: string }> {
    if (!file) throw new BadRequestException('No file was uploaded');
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException(`Image must be ${MAX_UPLOAD_BYTES / 1024 / 1024} MB or smaller`);
    }

    const signature = SIGNATURES.find((s) => s.match(file.buffer));
    if (!signature) {
      throw new BadRequestException('Unsupported image format. Use PNG, JPEG, GIF, or WebP.');
    }

    /*
     * Logo files are routinely exported onto a square canvas with the mark floating in
     * the middle, and anything that sizes them by height then renders the padding rather
     * than the logo. Trimming here rather than at render time means every consumer gets
     * a tight image without having to know about the problem.
     *
     * Only ever shrinks the canvas — the visible pixels are untouched — and any failure
     * falls back to storing the original.
     */
    let data = file.buffer;
    if (signature.ext === 'png') {
      const trimmed = trimTransparentPadding(file.buffer);
      if (trimmed.trimmed) {
        data = trimmed.buffer;
        this.logger.log(
          `Trimmed transparent padding: ${trimmed.from!.width}x${trimmed.from!.height} → ` +
            `${trimmed.to!.width}x${trimmed.to!.height}`,
        );
      }
    }

    const filename = `${randomUUID()}.${signature.ext}`;
    await writeFile(join(this.dir, filename), data);
    this.logger.log(`Stored ${filename} (${data.length} bytes, ${signature.mime})`);

    return { url: `${UPLOAD_ROUTE_PREFIX}/${filename}`, bytes: data.length, format: signature.mime };
  }

  /**
   * Deletes a previously stored image.
   *
   * The name is matched against the generated-name pattern *before* it is joined to a
   * path, so a traversal attempt is rejected as "not found" rather than being resolved
   * and then checked.
   */
  async removeImage(filename: string): Promise<void> {
    if (!STORED_NAME.test(filename)) throw new NotFoundException('Image not found');

    try {
      await unlink(join(this.dir, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new NotFoundException('Image not found');
      throw error;
    }
  }
}
