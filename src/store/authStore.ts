import { create } from 'zustand';
import { authProvider } from '@/services/auth';
import type { AppUser } from '@/types';

interface AuthState {
  user: AppUser | null;
  isLoading: boolean;
  /** True until the initial session restore completes. */
  isRestoring: boolean;
  rememberMe: boolean;
  restore: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  setRememberMe: (value: boolean) => void;
  updateProfile: (patch: Partial<AppUser>) => void;
  changePassword: (current: string, next: string) => Promise<void>;
  /** Self-service sign-up: creates the auth user and sends an OTP e-mail. */
  signUp: (fullName: string, email: string, password: string) => Promise<void>;
  /** Verify the OTP, provision the account, and set the session user. */
  verifyOtp: (email: string, code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
}

/**
 * Delegates to the active AuthProvider (mock or Supabase). The public surface
 * is identical to Phase 1, so screens are unchanged.
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isRestoring: true,
  rememberMe: true,

  restore: async () => {
    try {
      const user = await authProvider.restore();
      set({ user, isRestoring: false });
    } catch {
      set({ isRestoring: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const user = await authProvider.signIn(email, password);
      set({ user, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signOut: () => {
    void authProvider.signOut();
    set({ user: null });
  },

  setRememberMe: (value) => set({ rememberMe: value }),

  updateProfile: (patch) => {
    // Optimistic local update; persist in the background.
    const current = get().user;
    if (current) set({ user: { ...current, ...patch } });
    void authProvider.persistProfile(patch);
  },

  changePassword: async (current, next) => {
    await authProvider.changePassword(current, next);
  },

  signUp: async (fullName, email, password) => {
    // Do not set `user` here: the account is not usable until OTP verification.
    await authProvider.signUp(fullName, email, password);
  },

  verifyOtp: async (email, code) => {
    set({ isLoading: true });
    try {
      await authProvider.verifyOtp(email, code);
      const user = await authProvider.completeAccountSetup();
      set({ user, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  resendOtp: async (email) => {
    await authProvider.resendOtp(email);
  },
}));
