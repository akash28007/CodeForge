import { deflateSync } from 'zlib';
import { decodePng, encodePng, trimTransparentPadding } from './png-trim';

/**
 * Builds a PNG independently of `encodePng`, so the round-trip tests are not just the
 * encoder agreeing with itself. Uses a per-scanline filter of 1 (Sub) rather than 0 to
 * exercise the decoder's defiltering, which is the part most likely to be wrong.
 */
function buildPng(width: number, height: number, rgba: (x: number, y: number) => [number, number, number, number]) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typed = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed), 0);
    return Buffer.concat([len, typed, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const stride = width * 4;
  const rows = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    const base = y * (stride + 1);
    rows[base] = 1; // Sub filter
    const raw = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) raw.set(rgba(x, y), x * 4);
    for (let i = 0; i < stride; i++) {
      rows[base + 1 + i] = (raw[i] - (i >= 4 ? raw[i - 4] : 0)) & 0xff;
    }
  }

  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

/** Opaque red square of `inner` px, centred in a transparent canvas of `size` px. */
const padded = (size: number, inner: number) => {
  const start = Math.floor((size - inner) / 2);
  return buildPng(size, size, (x, y) => {
    const inside = x >= start && x < start + inner && y >= start && y < start + inner;
    return inside ? [255, 0, 0, 255] : [0, 0, 0, 0];
  });
};

describe('png-trim', () => {
  it('decodes a Sub-filtered image back to its original pixels', () => {
    const png = buildPng(3, 2, (x, y) => [x * 10, y * 20, 30, 255]);
    const decoded = decodePng(png)!;

    expect(decoded.width).toBe(3);
    expect(decoded.height).toBe(2);
    expect(decoded.channels).toBe(4);
    expect([...decoded.pixels.subarray(0, 8)]).toEqual([0, 0, 30, 255, 10, 0, 30, 255]);
  });

  it('crops a padded logo down to its visible bounds', () => {
    const result = trimTransparentPadding(padded(64, 16));

    expect(result.trimmed).toBe(true);
    expect(result.from).toEqual({ width: 64, height: 64 });
    expect(result.to).toEqual({ width: 16, height: 16 });
  });

  it('produces a valid PNG that still decodes to the visible pixels', () => {
    const result = trimTransparentPadding(padded(32, 4));
    const decoded = decodePng(result.buffer)!;

    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    // Every remaining pixel is the opaque red that was inside the padding.
    for (let i = 0; i < decoded.pixels.length; i += 4) {
      expect([...decoded.pixels.subarray(i, i + 4)]).toEqual([255, 0, 0, 255]);
    }
  });

  it('handles padding that is not centred', () => {
    // Ink only in the bottom-right 2x3 of a 10x10 canvas.
    const png = buildPng(10, 10, (x, y) => (x >= 8 && y >= 7 ? [1, 2, 3, 255] : [0, 0, 0, 0]));
    const result = trimTransparentPadding(png);

    expect(result.to).toEqual({ width: 2, height: 3 });
  });

  it('leaves an already-tight image untouched, byte for byte', () => {
    const png = buildPng(4, 4, () => [9, 9, 9, 255]);
    const result = trimTransparentPadding(png);

    expect(result.trimmed).toBe(false);
    expect(result.buffer).toBe(png);
  });

  it('leaves a fully transparent image alone rather than cropping to nothing', () => {
    const result = trimTransparentPadding(padded(16, 0));

    expect(result.trimmed).toBe(false);
  });

  it('treats a near-invisible fringe as padding', () => {
    // Alpha 4 is below the floor; only the alpha-255 pixel should survive.
    const png = buildPng(6, 6, (x, y) => (x === 3 && y === 3 ? [0, 0, 0, 255] : [0, 0, 0, 4]));

    expect(trimTransparentPadding(png).to).toEqual({ width: 1, height: 1 });
  });

  it('returns non-PNG data unchanged', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);

    expect(trimTransparentPadding(jpeg)).toEqual({ buffer: jpeg, trimmed: false });
  });

  it('returns a PNG without an alpha channel unchanged', () => {
    // colorType 2 (RGB) — nothing to trim against, and the decoder must decline it.
    const png = padded(8, 4);
    png[25] = 2;

    expect(trimTransparentPadding(png).trimmed).toBe(false);
  });

  it('does not throw on truncated or corrupt PNG data', () => {
    const truncated = padded(16, 8).subarray(0, 40);

    expect(() => trimTransparentPadding(truncated)).not.toThrow();
    expect(trimTransparentPadding(truncated).trimmed).toBe(false);
  });

  it('round-trips through encodePng without changing pixels', () => {
    const decoded = decodePng(buildPng(5, 3, (x, y) => [x, y, x + y, 200]))!;
    const reDecoded = decodePng(encodePng(decoded))!;

    expect(reDecoded.width).toBe(5);
    expect(reDecoded.height).toBe(3);
    expect(reDecoded.pixels.equals(decoded.pixels)).toBe(true);
  });
});
