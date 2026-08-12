/**
 * Validates the design tokens in src/index.css.
 *
 * The original palette was contrast- and colour-vision-checked rather than picked by
 * eye; retuning it by eye and calling it done would quietly undo that. This reads the
 * real token values out of the stylesheet and re-runs the same checks, so a regression
 * shows up as a number instead of a hunch.
 *
 *   node tools/check-contrast.mjs
 */
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const css = await readFile(join(HERE, '..', 'src', 'index.css'), 'utf8');

/** Pulls the `--c-*: r g b;` declarations out of one theme block. */
function tokensFor(selector) {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const block = css.slice(open, end);
  const out = {};
  for (const m of block.matchAll(/--c-([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

const srgb = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/** sRGB → CIE Lab, for perceptual distance between the difficulty colours. */
function lab([r, g, b]) {
  const [R, G, B] = [srgb(r), srgb(g), srgb(b)];
  let X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  let Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [X, Y, Z] = [f(X), f(Y), f(Z)];
  return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
}
const deltaE = (a, b) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

/** Brettel-style approximation, good enough to flag a collision. */
function simulate(rgb, kind) {
  const [r, g, b] = rgb.map(srgb);
  let R, G, B;
  if (kind === 'deutan') {
    R = 0.625 * r + 0.7 * g + 0.0 * b;
    G = 0.7 * r + 0.3 * g + 0.0 * b;
    B = 0.0 * r + 0.3 * g + 0.7 * b;
  } else if (kind === 'protan') {
    R = 0.567 * r + 0.433 * g;
    G = 0.558 * r + 0.442 * g;
    B = 0.242 * g + 0.758 * b;
  } else {
    R = 0.95 * r + 0.05 * g;
    G = 0.433 * g + 0.567 * b;
    B = 0.475 * g + 0.525 * b;
  }
  const to8 = (v) => {
    const c = Math.max(0, Math.min(1, v));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  return [to8(R), to8(G), to8(B)];
}

const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

let failures = 0;
const check = (label, value, min, unit = ':1') => {
  const ok = value >= min;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label.padEnd(38)} ${value.toFixed(2)}${unit} (min ${min})`);
};

for (const [name, selector] of [
  ['DARK', ':root {'],
  ['LIGHT', ":root[data-theme='light']"],
]) {
  const t = tokensFor(selector);
  console.log(`\n${name}  accent ${hex(t.accent)}  base ${hex(t.base)}  surface ${hex(t.surface)}`);

  // Body text and the two dimmer text roles, on both the page and card backgrounds.
  check('primary text on base', contrast(t.primary, t.base), 4.5);
  check('primary text on surface', contrast(t.primary, t.surface), 4.5);
  check('secondary text on surface', contrast(t.secondary, t.surface), 4.5);
  check('muted text on surface', contrast(t.muted, t.surface), 4.5);
  check('muted text on raised', contrast(t.muted, t.raised), 4.5);

  // The accent as a link/label, and as a solid button fill.
  check('accent text on base', contrast(t.accent, t.base), 4.5);
  check('accent text on surface', contrast(t.accent, t.surface), 4.5);
  check('on-accent text on accent fill', contrast(t['on-accent'], t.accent), 4.5);
  check('on-accent on accent-soft (hover)', contrast(t['on-accent'], t['accent-soft']), 4.5);

  // Difficulty and status colours are used as small text on cards.
  for (const k of ['easy', 'medium', 'hard', 'info', 'error']) {
    check(`${k} text on surface`, contrast(t[k], t.surface), 4.5);
  }

  /*
   * The page ambience washes sit *behind* body copy, so the effective background is not
   * `base` but `base` with each gradient composited over it. Checking only the flat
   * token would miss a real regression: raising a wash opacity lightens the ground under
   * every piece of text on the page.
   */
  const over = (fg, bg, alpha) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
  const alphas = name === 'DARK' ? [0.16, 0.1] : [0.05, 0.04];
  for (const [i, grad] of [t['grad-a'], t['grad-b']].entries()) {
    const composited = over(grad, t.base, alphas[i]);
    const label = i === 0 ? 'grad-a' : 'grad-b';
    check(`primary text over ${label} wash`, contrast(t.primary, composited), 4.5);
    check(`secondary text over ${label} wash`, contrast(t.secondary, composited), 4.5);
    check(`muted text over ${label} wash`, contrast(t.muted, composited), 4.5);
    check(`accent text over ${label} wash`, contrast(t.accent, composited), 4.5);
  }

  // The primary button is a gradient fill. Its label has to clear the threshold across
  // the whole sweep, so both stops are checked — a button whose far end fails is a
  // failing button, however good the near end looks.
  check('button label on gradient start', contrast(t['on-btn'], t['btn-from']), 4.5);
  check('button label on gradient end', contrast(t['on-btn'], t['btn-to']), 4.5);

  // Second accent, used for chips and figures.
  check('accent-2 text on surface', contrast(t['accent-2'], t.surface), 4.5);
  check('accent-2 text on base', contrast(t['accent-2'], t.base), 4.5);

  /*
   * `.card-glow` paints a tone over the card at its strongest corner. Card text is
   * measured against `surface`, so that wash has to be weak enough that the composited
   * corner still clears the threshold — otherwise every "text on surface" figure above
   * is quietly wrong for the top-left of every glowing card.
   */
  const glowAlpha = name === 'DARK' ? 0.12 : 0.1;
  for (let i = 1; i <= 6; i++) {
    const lit = over(t[`tone-${i}`], t.surface, glowAlpha);
    check(`secondary text on tone-${i} glow`, contrast(t.secondary, lit), 4.5);
    check(`muted text on tone-${i} glow`, contrast(t.muted, lit), 4.5);
  }

  // Decorative tones. Each is used as a small count figure on a card, so all six have to
  // clear the text threshold — "it's only decorative" stops being true the moment one
  // of them is a number somebody reads.
  for (let i = 1; i <= 6; i++) {
    check(`tone-${i} text on surface`, contrast(t[`tone-${i}`], t.surface), 4.5);
  }

  // The wordmark is gradient-filled text. A gradient is only as legible as its worst
  // stop, so both ends are checked as if each were a flat colour.
  check('brand gradient stop A as text', contrast(t['brand-a'], t.base), 4.5);
  check('brand gradient stop B as text', contrast(t['brand-b'], t.base), 4.5);

  // Strong fills that print text on top of them. `canvas` is the foreground in both
  // themes: it is the opposite end of the scale from the fill in each.
  check('canvas ink on hard fill (badge)', contrast(t.base, t.hard), 4.5);
  check('canvas ink on error fill', contrast(t.base, t.error), 4.5);

  // Activity calendar prints the day number on the ramp. Steps 1-2 take `primary`,
  // steps 3-4 take `canvas` — the flip happens at the same step in both themes.
  check('primary ink on heat-1', contrast(t.primary, t['heat-1']), 4.5);
  check('primary ink on heat-2', contrast(t.primary, t['heat-2']), 4.5);
  check('canvas ink on heat-3', contrast(t.base, t['heat-3']), 4.5);
  check('canvas ink on heat-4', contrast(t.base, t['heat-4']), 4.5);

  /*
   * The empty-day cell has to be visible against the card. This is the check that would
   * have caught the dark calendar rendering as a blank rectangle: `heat-0` had drifted to
   * within a couple of points of `surface`, so every day with no activity disappeared.
   */
  check('heat-0 (empty cell) vs surface', contrast(t['heat-0'], t.surface), 1.25);

  // The ramp must actually be a ramp, or intensity stops being readable as intensity.
  const ramp = [0, 1, 2, 3, 4].map((i) => luminance(t[`heat-${i}`]));
  const monotonic = ramp.every((v, i) => i === 0 || (name === 'DARK' ? v > ramp[i - 1] : v < ramp[i - 1]));
  check('heat ramp is monotonic', monotonic ? 1 : 0, 1, '');

  // Layer separation — if these collapse, the UI reads as one flat sheet.
  check('surface vs base separation', contrast(t.surface, t.base), 1.05);
  check('raised vs surface separation', contrast(t.raised, t.surface), 1.05);

  // The difficulty triad must stay tellable apart, including under colour blindness.
  const triad = [
    ['easy', 'medium'],
    ['easy', 'hard'],
    ['medium', 'hard'],
  ];
  for (const [a, b] of triad) check(`dE ${a}/${b}`, deltaE(t[a], t[b]), 15, '');
  for (const kind of ['deutan', 'protan', 'tritan']) {
    const worst = Math.min(...triad.map(([a, b]) => deltaE(simulate(t[a], kind), simulate(t[b], kind))));
    check(`dE worst pair (${kind})`, worst, 6, '');
  }

  // The accent must not be mistaken for a difficulty colour — it appears next to them.
  for (const k of ['easy', 'medium', 'hard']) {
    check(`dE accent/${k}`, deltaE(t.accent, t[k]), 15, '');
  }
}

console.log(failures === 0 ? '\nAll token checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures ? 1 : 0);
