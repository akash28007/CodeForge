import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../services/api';
import { clearAuth, loadAuth, saveAuth, type StoredUser } from '../utils/authStorage';

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
    saveAuth({ user: res.data.user, token: res.data.accessToken }, remember);
    setUser(res.data.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await api.post('/auth/register', { name, email, password });
    saveAuth({ user: res.data.user, token: res.data.accessToken }, true);
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
    // Persist to whichever store the session already uses, so a "remember me" choice sticks.
    saveAuth({ user: next, token: stored.token }, localStorage.getItem('codeforge_auth') !== null);
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
