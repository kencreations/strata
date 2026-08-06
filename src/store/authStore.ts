import { create } from 'zustand';
import type { AuthUser } from '../services/authService';
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  getStoredUser,
  isAuthenticated,
} from '../services/authService';
import { GUEST_USER_ID } from '../db/migrations';

interface AuthState {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  isGuest: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const authenticated = await isAuthenticated();
    if (authenticated) {
      const user = await getStoredUser();
      set({ user, isLoggedIn: true, isGuest: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiLogin(email, password);
      set({ user, isLoggedIn: true, isGuest: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? 'Login failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await apiSignup(email, password, fullName);
      set({ user, isLoggedIn: true, isGuest: false });
    } catch (e: any) {
      set({ error: e?.response?.data?.message ?? 'Sign-up failed' });
    } finally {
      set({ isLoading: false });
    }
  },

  continueAsGuest: () => {
    set({
      user: {
        id: GUEST_USER_ID,
        email: 'guest@strata.app',
        fullName: 'Alex Chen',
        role: 'student',
        authProvider: 'email',
      },
      isLoggedIn: true,
      isGuest: true,
    });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, isLoggedIn: false, isGuest: false });
  },

  clearError: () => set({ error: null }),
}));
