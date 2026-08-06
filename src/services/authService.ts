import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const TOKEN_KEY = 'strata_auth_token';
const REFRESH_KEY = 'strata_refresh_token';
const USER_KEY = 'strata_user';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: API_BASE_URL, timeout: 10_000 });

// Attach JWT to every request automatically
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth interfaces ──────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  authProvider: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Core auth functions ──────────────────────────────────────────────────────

export async function login(
  email: string,
  password: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = await api.post<{ user: AuthUser; tokens: AuthTokens }>(
    '/auth/login',
    { email, password }
  );
  await persistTokens(data.tokens, data.user);
  return data;
}

export async function signup(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: AuthUser; tokens: AuthTokens }> {
  const { data } = await api.post<{ user: AuthUser; tokens: AuthTokens }>(
    '/auth/signup',
    { email, password, fullName }
  );
  await persistTokens(data.tokens, data.user);
  return data;
}

export async function loginWithGoogle(googleIdToken: string): Promise<{
  user: AuthUser;
  tokens: AuthTokens;
}> {
  const { data } = await api.post<{ user: AuthUser; tokens: AuthTokens }>(
    '/auth/google',
    { idToken: googleIdToken }
  );
  await persistTokens(data.tokens, data.user);
  return data;
}

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
    if (!refreshToken) return null;
    const { data } = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    await SecureStore.setItemAsync(TOKEN_KEY, data.accessToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// ─── Token helpers ────────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getStoredUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredToken();
  if (!token) return false;

  // Decode JWT payload (no verify — server verifies on every API call)
  try {
    const [, payloadB64] = token.split('.');
    const payload = JSON.parse(atob(payloadB64));
    const exp = payload.exp as number;
    return Date.now() / 1000 < exp;
  } catch {
    return false;
  }
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function persistTokens(tokens: AuthTokens, user: AuthUser): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export { api };
