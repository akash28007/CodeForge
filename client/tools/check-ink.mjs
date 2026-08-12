/**
 * Scans the source for foreground/background pairings that can render text on a strong
 * fill in a colour that is not guaranteed to be legible.
 *
 * Why this exists: the same defect was found and fixed four separate times by looking at
 * screenshots — a selected chip whose hover rule turned its label near-black on its own
 * fill, a notification badge with white on a light red, a calendar cell, a checkbox tick.
 * Each was individually small and individually invisible in review. Contrast tokens are
 * already validated by check-contrast.mjs; this checks the other half of the problem,
 * which is components *pairing* them wrongly.
 *
 *   node tools/check-ink.mjs
 */
import { readdir, readFile } from 'fs/promises';
import { dirname, extname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src');

/** Fills whose luminance flips between themes — text on them needs a paired ink token. */
const STRONG_FILL = /\bbg-(accent2|accent|hard|easy|medium|info|error)\b(?!\/)/;

/**
 * Inks that are safe on a strong fill because they are defined *against* it:
 *   on-accent / on-btn — the token whose whole job is "goes on top of the accent"
 *   canvas             — the page colour, always the opposite end from a strong fill
 * `btn-gradient` and `cf-checkbox` carry their own colour, so they need no ink class.
 */
const SAFE_INK = /\btext-(on-accent|canvas)\b/;
const SELF_COLOURED = /\b(btn-gradient|cf-checkbox|text-brand-gradient)\b/;

/** Inks that follow the *page*, so they invert relative to a strong fill. */
const UNSAFE_INK = /\btext-(primary|secondary|muted|subtle)\b/;

/**
 * Hard-coded absolutes: correct in one theme by definition, wrong in the other.
 *
 * A *translucent* black or white (`bg-black/70`) is exempt — that is a scrim or an
 * overlay, which is conventionally absolute in both themes and sits over arbitrary
 * content rather than pairing with a token.
 */
const HARD_CODED = /\b(text|bg|fill|stroke)-(white|black)\b(?!\/)/;

const problems = [];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (['.tsx', '.ts'].includes(extname(entry.name))) yield full;
  }
}

for await (const file of walk(SRC)) {
  const raw = await readFile(file, 'utf8');
  const rel = relative(join(HERE, '..'), file).replace(/\\/g, '/');

  // Block comments are blanked out first, newlines preserved so line numbers still point
  // at the right place. Without this the scanner flags its own explanatory comments.
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

  text.split('\n').forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    const code = line.replace(/\/\/.*$/, '');

    // A strong fill on an element that also sets a page-following ink.
    if (STRONG_FILL.test(code) && UNSAFE_INK.test(code) && !SELF_COLOURED.test(code)) {
      problems.push({ at, why: 'strong fill paired with a page-following text colour', line: code.trim() });
    }

    // A strong fill with no ink at all and nothing self-colouring — fine for a dot or a
    // bar, suspicious for anything with children. Flagged only when text utilities are
    // present on the same element, which implies it renders something.
    if (STRONG_FILL.test(code) && /\btext-(xs|sm|base|lg|\[)/.test(code) && !SAFE_INK.test(code) && !SELF_COLOURED.test(code)) {
      problems.push({ at, why: 'strong fill with sized text but no paired ink token', line: code.trim() });
    }

    if (HARD_CODED.test(code)) {
      problems.push({ at, why: 'hard-coded white/black — cannot be correct in both themes', line: code.trim() });
    }
  });
}

if (problems.length === 0) {
  console.log('No risky fill/ink pairings found.');
  process.exit(0);
}

console.log(`${problems.length} risky pairing(s):\n`);
for (const p of problems) {
  console.log(`  ${p.at}\n    ${p.why}\n    ${p.line.slice(0, 150)}\n`);
}
process.exit(1);
