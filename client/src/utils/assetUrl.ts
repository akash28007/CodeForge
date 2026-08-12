import { API_BASE } from '../services/api';

/**
 * Resolves a stored image path to something an <img> can actually load.
 *
 * Uploads are written by the API and served from *its* origin under `/uploads/...`,
 * while the client is served from a different one (Vite in dev, Vercel in production).
 * A bare `/uploads/x.png` therefore resolves against the front-end origin and 404s —
 * so every stored path has to be prefixed with the API base before it is rendered.
 *
 * Values that are already absolute (an external URL an admin pasted, or a data: URI)
 * are returned untouched.
 */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path;
  return `${API_BASE.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
