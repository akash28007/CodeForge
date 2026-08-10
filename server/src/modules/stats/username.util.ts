/**
 * Turns a display name (or email local part) into a candidate handle.
 * Lowercase, alphanumerics plus underscore, 3-20 characters.
 */
export function slugifyUsername(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);

  // Guarantees a usable stem even for input that slugifies to nothing (e.g. "***").
  return base.length >= 3 ? base : `user_${base}`.slice(0, 20);
}

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
