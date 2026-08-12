import { deflateSync, inflateSync } from 'zlib';

/**
 * Trims transparent padding from uploaded PNGs.
 *
 * Why this exists: logo files are routinely exported onto a square canvas with the mark
 * floating in the middle. A 2800x2800 Google wordmark measured 2324x758 of actual ink —
 * 27% of the canvas height. The marquee sizes logos by height, and that constraint
 * applies to the whole canvas, padding included, so the logo rendered at roughly a third
 * the size of its neighbours. Cropping to the ink bounds is the only fix that does not
 * depend on whoever exported the file having done it correctly.
 *
 * Deliberately hand-rolled rather than pulling in `sharp`: the work is a zlib inflate, a
 * defilter, a crop and a deflate, all of which Node does natively. `sharp` is a native
 * build-step dependency, and this is not enough work to justify one.
 *
 * The supported case — 8-bit RGBA/grey-alpha, non-interlaced — is what image editors and
 * logo downloads emit. Anything else (JPEG, WebP, GIF, paletted or 16-bit PNG) is stored
 * untouched, which is the correct outcome: those have no alpha channel to trim, or are
 * rare enough not to be worth the decoder.
 */

/** Above this, decoding would allocate more memory than an upload is worth. */
const MAX_PIXELS = 30_000_000;
/** Alpha at or below this counts as background. Not 0, so near-invisible fringes go too. */
const ALPHA_FLOOR = 8;

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface DecodedPng {
  width: number;
  height: number;
  /** 4 for RGBA, 2 for grey+alpha. */
  channels: number;
  /** Row-major, `channels` bytes per pixel, alpha last. */
  pixels: Buffer;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typed = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed), 0);
  return Buffer.concat([length, typed, crc]);
}

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** Returns null for anything this decoder does not handle — never throws on shape. */
export function decodePng(buffer: Buffer): DecodedPng | null {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return null;

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const interlace = buffer[28];

  // Only the alpha-bearing, 8-bit, non-interlaced forms. Everything else has either no
  // padding to trim or a decoder cost out of proportion to how often it appears.
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 4)) return null;
  if (width * height > MAX_PIXELS || width === 0 || height === 0) return null;

  const channels = colorType === 6 ? 4 : 2;

  const parts: Buffer[] = [];
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    if (type === 'IDAT') parts.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (parts.length === 0) return null;

  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;

  const pixels = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = pixels.subarray(y * stride, (y + 1) * stride);
    const prevStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? cur[x - channels] : 0;
      const up = y > 0 ? pixels[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[prevStart + x - channels] : 0;
      const v = line[x];
      cur[x] =
        filter === 0
          ? v
          : filter === 1
            ? (v + left) & 0xff
            : filter === 2
              ? (v + up) & 0xff
              : filter === 3
                ? (v + ((left + up) >> 1)) & 0xff
                : (v + paeth(left, up, upLeft)) & 0xff;
    }
  }

  return { width, height, channels, pixels };
}

/** Re-encodes with no per-scanline filtering — deflate does the compression. */
export function encodePng({ width, height, channels, pixels }: DecodedPng): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 4;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * channels;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    rows[y * (stride + 1)] = 0;
    pixels.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export interface TrimResult {
  buffer: Buffer;
  trimmed: boolean;
  /** Present when trimmed, for logging. */
  from?: { width: number; height: number };
  to?: { width: number; height: number };
}

/**
 * Crops a PNG to its non-transparent bounds.
 *
 * Returns the input unchanged when the format is unsupported, when the image is fully
 * transparent, or when there is no meaningful padding — re-encoding an already-tight
 * image would only discard its original compression for nothing.
 */
export function trimTransparentPadding(buffer: Buffer): TrimResult {
  let image: DecodedPng | null;
  try {
    image = decodePng(buffer);
  } catch {
    // A malformed or unusual PNG is not an upload failure — it is simply not trimmable.
    return { buffer, trimmed: false };
  }
  if (!image) return { buffer, trimmed: false };

  const { width, height, channels, pixels } = image;
  const stride = width * channels;
  const alphaOffset = channels - 1;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const row = y * stride;
    for (let x = 0; x < width; x++) {
      if (pixels[row + x * channels + alphaOffset] > ALPHA_FLOOR) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return { buffer, trimmed: false };

  const newWidth = maxX - minX + 1;
  const newHeight = maxY - minY + 1;
  if (newWidth === width && newHeight === height) return { buffer, trimmed: false };

  const cropped = Buffer.alloc(newHeight * newWidth * channels);
  for (let y = 0; y < newHeight; y++) {
    const src = (minY + y) * stride + minX * channels;
    pixels.copy(cropped, y * newWidth * channels, src, src + newWidth * channels);
  }

  return {
    buffer: encodePng({ width: newWidth, height: newHeight, channels, pixels: cropped }),
    trimmed: true,
    from: { width, height },
    to: { width: newWidth, height: newHeight },
  };
}
