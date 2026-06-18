import type { AppUser } from '@/types';

/**
 * Auth abstraction. A mock provider backs Phase 1; the Supabase provider backs
 * Phase 2. The auth store consumes this interface and never changes.
 */
export interface AuthProvider {
  signIn(email: string, password: string): Promise<AppUser>;
  signOut(): Promise<void>;
  /** Restore a persisted session on app start (null if none). */
  restore(): Promise<AppUser | null>;
  /** Persist editable profile fields (name, phone, avatar). Best-effort. */
  persistProfile(patch: Partial<AppUser>): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
}
