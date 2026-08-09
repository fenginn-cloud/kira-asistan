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
  async signUp(fullName, email) {
    await new Promise((r) => setTimeout(r, 400));
    if (!fullName.trim()) throw new Error('Ad soyad zorunludur.');
    return { needsVerification: true, email: email.trim().toLowerCase() };
  },
  async verifyOtp(_email, code) {
    await new Promise((r) => setTimeout(r, 400));
    if (code.trim().length !== 6) throw new Error('Doğrulama kodu 6 haneli olmalı.');
  },
  async resendOtp() {
    await new Promise((r) => setTimeout(r, 300));
  },
  async completeAccountSetup() {
    await new Promise((r) => setTimeout(r, 300));
    return { ...mockUsers[0]!, lastLoginAt: new Date().toISOString() };
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
