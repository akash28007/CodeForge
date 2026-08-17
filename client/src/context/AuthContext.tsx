import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { clearAuth, isRemembered, loadAuth, saveAuth, type StoredUser } from '../utils/authStorage';

interface AuthContextValue {
  user: StoredUser | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Re-reads the profile after an edit so the navbar and dropdown stay in step. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadAuth()?.user ?? null);
    setLoading(false);
  }, []);

  async function login(email: string, password: string, remember = true) {
    const res = await api.post('/auth/login', { email, password });
    saveAuth(
      {
        user: res.data.user,
        token: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      },
      remember,
    );
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post('/auth/register', { name, email, password });
    saveAuth(
      {
        user: res.data.user,
        token: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      },
      true,
    );
    setUser(res.data.user);
  }

  function logout() {
    clearAuth();
    setUser(null);
  }

  async function refreshUser() {
    const stored = loadAuth();
    if (!stored) return;
    const res = await api.get('/profile');
    const next = { ...stored.user, ...res.data };
    // Spread `stored` first so the refresh token survives — rebuilding this object by
    // hand dropped it, which logged the user out 15 minutes after any profile edit.
    // Persist to whichever store the session already uses, so a "remember me" choice sticks.
    saveAuth({ ...stored, user: next }, isRemembered());
    setUser(next);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
