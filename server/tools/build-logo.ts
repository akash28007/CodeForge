/**
 * Regenerates the brand assets in client/public from the source artwork.
 *
 * Run from the server package root:  npx ts-node --compiler-options {"module":"commonjs"} tools/build-logo.ts
 *
 * Turns the supplied logo (a paletted PNG on a solid black background) into
 * transparent assets the site can use in both themes.
 *
 * Keying black to transparent with a threshold would leave dark halos on every
 * anti-aliased edge. The source is a bright mark composited over pure black, i.e.
 * `pixel = colour * alpha`, so the alpha is recoverable: take the brightest channel as
 * alpha and divide it back out to get the original colour. That reconstructs clean edges
 * rather than crunchy ones.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { inflateSync } from 'zlib';
import { join } from 'path';
import { encodePng, trimTransparentPadding, decodePng, type DecodedPng } from '../src/modules/uploads/png-trim';

const SOURCE = 'C:/Users/IIITA/Desktop/Projects/CodeForge imp/logocf.png';
const OUT_DIR = join('..', 'client', 'public');

/** Minimal decoder for colour-type 3 (palette, 8-bit) — the one form `png-trim` declines. */
function decodePaletted(buffer: Buffer): DecodedPng {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  const idat: Buffer[] = [];
  let palette: Buffer | null = null;
  let offset = 8;
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('latin1');
    if (type === 'PLTE') palette = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IDAT') idat.push(buffer.subarray(offset + 8, offset + 8 + length));
    if (type === 'IEND') break;
    offset += 12 + length;
  }
  if (!palette) throw new Error('no PLTE chunk');

  const raw = inflateSync(Buffer.concat(idat));
  const indices = Buffer.alloc(width * height);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };

  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let x = 0; x < width; x++) {
      const v = raw[pos++];
      const left = x > 0 ? indices[y * width + x - 1] : 0;
      const up = y > 0 ? indices[(y - 1) * width + x] : 0;
      const upLeft = y > 0 && x > 0 ? indices[(y - 1) * width + x - 1] : 0;
      indices[y * width + x] =
        filter === 0 ? v
        : filter === 1 ? (v + left) & 0xff
        : filter === 2 ? (v + up) & 0xff
        : filter === 3 ? (v + ((left + up) >> 1)) & 0xff
        : (v + paeth(left, up, upLeft)) & 0xff;
    }
  }

  const pixels = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = indices[i] * 3;
    pixels[i * 4] = palette[p];
    pixels[i * 4 + 1] = palette[p + 1];
    pixels[i * 4 + 2] = palette[p + 2];
    pixels[i * 4 + 3] = 255;
  }
  return { width, height, channels: 4, pixels };
}

/**
 * Drops the black background while keeping the artwork's real colours.
 *
 * The obvious approach — treat brightness as alpha and divide it back out — reconstructs
 * perfect edges but ruins the deep purples: a genuinely dark colour gets read as "a light
 * colour at low opacity", so it turns pale and see-through. That composites back to the
 * original over black, but the light theme is white, where it looks washed out.
 *
 * So colour is left untouched and only the *alpha* is derived from brightness, with a
 * steep ramp: anything with a channel above ~85 is fully opaque, and only the darkest
 * edge pixels get partial alpha. Deep purple stays deep purple on either ground, and
 * edges still soften rather than going blocky.
 */
const EDGE_RAMP = 3;

function keyOutBlack(image: DecodedPng): DecodedPng {
  const out = Buffer.from(image.pixels);
  for (let i = 0; i < out.length; i += 4) {
    const brightest = Math.max(out[i], out[i + 1], out[i + 2]);
    out[i + 3] = Math.min(255, brightest * EDGE_RAMP);
  }
  return { ...image, pixels: out };
}

/** Box-filter downscale. Averages in premultiplied space so edges do not darken. */
function resize(image: DecodedPng, targetW: number, targetH: number): DecodedPng {
  const { width, height, pixels } = image;
  const out = Buffer.alloc(targetW * targetH * 4);
  for (let y = 0; y < targetH; y++) {
    const y0 = Math.floor((y * height) / targetH);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / targetH));
    for (let x = 0; x < targetW; x++) {
      const x0 = Math.floor((x * width) / targetW);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / targetW));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * width + sx) * 4;
          const pa = pixels[i + 3] / 255;
          r += pixels[i] * pa;
          g += pixels[i + 1] * pa;
          b += pixels[i + 2] * pa;
          a += pixels[i + 3];
          n++;
        }
      }
      const o = (y * targetW + x) * 4;
      const avgA = a / n;
      const pa = avgA / 255;
      out[o] = pa > 0 ? Math.min(255, Math.round(r / n / pa)) : 0;
      out[o + 1] = pa > 0 ? Math.min(255, Math.round(g / n / pa)) : 0;
      out[o + 2] = pa > 0 ? Math.min(255, Math.round(b / n / pa)) : 0;
      out[o + 3] = Math.round(avgA);
    }
  }
  return { width: targetW, height: targetH, channels: 4, pixels: out };
}

/**
 * Keeps the right-hand portion of the mark.
 *
 * The full swoosh is 2.7:1. Letterboxed into a square favicon it occupies about a third
 * of the height and its strokes thin to nothing by 32px. The dense curl on the right —
 * where the two arcs converge — is both the recognisable part and close to square, so
 * cropping to it is what makes the icon legible at tab size.
 */
function cropRight(image: DecodedPng, fraction: number): DecodedPng {
  const width = Math.round(image.width * fraction);
  const startX = image.width - width;
  const out = Buffer.alloc(width * image.height * 4);
  for (let y = 0; y < image.height; y++) {
    const src = (y * image.width + startX) * 4;
    image.pixels.copy(out, y * width * 4, src, src + width * 4);
  }
  return { width, height: image.height, channels: 4, pixels: out };
}

/** Centres a wide mark on a square canvas — a favicon slot is square, the mark is not. */
function square(image: DecodedPng, size: number, padding = 0.08): DecodedPng {
  const inner = Math.round(size * (1 - padding * 2));
  const scale = Math.min(inner / image.width, inner / image.height);
  const w = Math.max(1, Math.round(image.width * scale));
  const h = Math.max(1, Math.round(image.height * scale));
  const scaled = resize(image, w, h);

  const out = Buffer.alloc(size * size * 4);
  const ox = Math.floor((size - w) / 2);
  const oy = Math.floor((size - h) / 2);
  for (let y = 0; y < h; y++) {
    scaled.pixels.copy(out, ((y + oy) * size + ox) * 4, y * w * 4, (y + 1) * w * 4);
  }
  return { width: size, height: size, channels: 4, pixels: out };
}

async function main() {
  const source = await readFile(SOURCE);
  const decoded = source[25] === 3 ? decodePaletted(source) : decodePng(source);
  if (!decoded) throw new Error('could not decode the source logo');
  console.log(`source ${decoded.width}x${decoded.height}`);

  const keyed = keyOutBlack(decoded);
  const trimmed = trimTransparentPadding(encodePng(keyed));
  const mark = decodePng(trimmed.buffer)!;
  console.log(`mark   ${mark.width}x${mark.height}  (aspect ${(mark.width / mark.height).toFixed(2)})`);

  await mkdir(OUT_DIR, { recursive: true });

  // Full-resolution wide mark for the navbar, footer and auth pages.
  await writeFile(join(OUT_DIR, 'logo.png'), encodePng(mark));

  // Square icons, cropped to the curl so the strokes survive at tab size.
  const icon = trimTransparentPadding(encodePng(cropRight(mark, 0.46)));
  const iconMark = decodePng(icon.buffer)!;
  console.log(`icon   ${iconMark.width}x${iconMark.height}  (aspect ${(iconMark.width / iconMark.height).toFixed(2)})`);

  for (const size of [32, 180]) {
    const name = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`;
    await writeFile(join(OUT_DIR, name), encodePng(square(iconMark, size, 0.06)));
    console.log(`wrote ${name} (${size}x${size})`);
  }
  console.log('wrote logo.png');
}

void main();
