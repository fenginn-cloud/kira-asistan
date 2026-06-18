import { mockUsers } from '@/data/mock';
import type { AppUser } from '@/types';
import type { AuthProvider } from './types';

/** Phase 1 mock auth: any password logs in as the matching (or first) user. */
export const mockAuthProvider: AuthProvider = {
  async signIn(email) {
    await new Promise((r) => setTimeout(r, 500));
    const matched =
      mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ??
      mockUsers[0]!;
    return { ...matched, lastLoginAt: new Date().toISOString() };
  },
  async signOut() {},
  async restore() {
    return null;
  },
  async persistProfile() {},
  async changePassword(current, next) {
    await new Promise((r) => setTimeout(r, 400));
    if (!current.trim()) throw new Error('Mevcut şifrenizi girin.');
    if (next.trim().length < 6) throw new Error('Yeni şifre en az 6 karakter olmalı.');
  },
};
