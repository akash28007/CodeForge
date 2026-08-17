export interface StoredUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  /** Absent on sessions stored before avatars existed — treat as "no picture". */
  avatarUrl?: string | null;
}

export interface StoredAuth {
  user: StoredUser;
  token: string;
  /**
   * Access tokens live 15 minutes (`JWT_EXPIRES_IN`), so without this a session died
   * a quarter of an hour after signing in and dumped the user back on /login. Absent
   * on sessions stored before refresh was wired up — those get one clean re-login.
   */
  refreshToken?: string;
}

const KEY = 'codeforge_auth';

/**
 * "Remember me" is a real storage decision, not a cosmetic checkbox:
 * checked  → localStorage, survives closing the browser
 * unchecked → sessionStorage, cleared when the tab closes
 */
export function loadAuth(): StoredAuth | null {
  const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return null;
  }
}

export function saveAuth(auth: StoredAuth, remember = true): void {
  const store = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  other.removeItem(KEY);
  store.setItem(KEY, JSON.stringify(auth));
}

export function clearAuth(): void {
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
}

/**
 * Which store the live session is in, so re-saving after a token refresh does not
 * silently promote a "don't remember me" session into localStorage.
 */
export function isRemembered(): boolean {
  return localStorage.getItem(KEY) !== null;
}
