/**
 * Stable decorative colour for a string.
 *
 * Used where a set of items should simply look *different* from one another — topic
 * tiles, initials avatars — rather than encode anything. The tone is derived from the
 * text itself, so "arrays" is the same colour on every page and across reloads, and
 * adding a topic never reshuffles the others (which an index-based assignment would).
 *
 * These carry no meaning, so nothing is lost if two items collide on a tone.
 */
const TONE_COUNT = 6;

/** FNV-1a. Small, no dependencies, and well spread for short lowercase words. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** `1`–`6`, matching the `--c-tone-N` tokens. */
export function toneIndex(key: string): number {
  return (hash(key.toLowerCase()) % TONE_COUNT) + 1;
}

/**
 * The bare `var(--c-tone-N)` reference — an `r g b` triplet, not a colour.
 *
 * Use this when the value is fed to something that applies its own alpha, such as the
 * `--glow` custom property on `.card-glow`.
 */
export function toneVar(key: string): string {
  return `var(--c-tone-${toneIndex(key)})`;
}

/** A `rgb(...)` string usable in `color`, `backgroundColor` or a gradient. */
export function toneColor(key: string, alpha?: number): string {
  const v = toneVar(key);
  return alpha === undefined ? `rgb(${v})` : `rgb(${v} / ${alpha})`;
}
