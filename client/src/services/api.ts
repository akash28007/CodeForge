import axios, { type InternalAxiosRequestConfig } from 'axios';
import { clearAuth, isRemembered, loadAuth, saveAuth } from '../utils/authStorage';

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const auth = loadAuth();
  if (auth?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

/**
 * Refreshing goes through its own client. Using `api` here would re-enter the response
 * interceptor below, so a failing refresh would try to refresh itself forever.
 */
const refreshClient = axios.create({ baseURL: API_BASE });

/** Endpoints where a 401 means "those credentials are wrong", not "your token aged out". */
const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Shared across callers on purpose. A page that fires six requests at once gets six
 * simultaneous 401s; without this they would each POST /auth/refresh, and because the
 * server rotates the refresh token every call, five of those six would be rejected as
 * stale and log the user out — the exact bug this function exists to prevent.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  const stored = loadAuth();
  if (!stored?.refreshToken) return null;

  try {
    const res = await refreshClient.post('/auth/refresh', {
      refreshToken: stored.refreshToken,
    });
    saveAuth(
      {
        user: res.data.user ?? stored.user,
        token: res.data.accessToken,
        refreshToken: res.data.refreshToken ?? stored.refreshToken,
      },
      isRemembered(),
    );
    return res.data.accessToken as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetriableConfig | undefined;
    const url = config?.url ?? '';

    const shouldTryRefresh =
      error?.response?.status === 401 &&
      config &&
      !config._retried &&
      !AUTH_PATHS.some((p) => url.includes(p)) &&
      loadAuth()?.refreshToken;

    if (shouldTryRefresh) {
      config._retried = true;

      refreshInFlight =
        refreshInFlight ??
        refreshTokens().finally(() => {
          refreshInFlight = null;
        });
      const token = await refreshInFlight;

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      }
    }

    if (error?.response?.status === 401 && !AUTH_PATHS.some((p) => url.includes(p))) {
      clearAuth();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);
