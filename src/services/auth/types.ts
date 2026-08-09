import type { AppUser } from '@/types';

/**
 * Auth abstraction. A mock provider backs Phase 1; the Supabase provider backs
 * Phase 2. The auth store consumes this interface and never changes.
 */
/** Outcome of a sign-up attempt. */
export interface SignUpResult {
  /** True when Supabase created an unconfirmed user and sent an OTP e-mail. */
  needsVerification: boolean;
  email: string;
}

export interface AuthProvider {
  signIn(email: string, password: string): Promise<AppUser>;
  signOut(): Promise<void>;
  /**
   * Self-service registration. Creates the auth user (unconfirmed) and triggers
   * a 6-digit OTP e-mail. The full name is stored in user metadata and read
   * back — server-side only — during {@link completeAccountSetup}. No company
   * or profile row is created here.
   */
  signUp(fullName: string, email: string, password: string): Promise<SignUpResult>;
  /**
   * Verify the 6-digit sign-up OTP. On success a session exists and the e-mail
   * is confirmed. Does NOT create the company/profile — call
   * {@link completeAccountSetup} afterwards.
   */
  verifyOtp(email: string, code: string): Promise<void>;
  /** Re-send the sign-up OTP e-mail. */
  resendOtp(email: string): Promise<void>;
  /**
   * Idempotently provision company + profile + notification_preferences for the
   * current (verified) user via the bootstrap_self_service_account RPC, then
   * return the loaded profile. Safe to call repeatedly and safe for existing
   * accounts (returns their profile unchanged, creates nothing).
   */
  completeAccountSetup(): Promise<AppUser>;
  /** Restore a persisted session on app start (null if none). */
  restore(): Promise<AppUser | null>;
  /** Persist editable profile fields (name, phone, avatar). Best-effort. */
  persistProfile(patch: Partial<AppUser>): Promise<void>;
  changePassword(current: string, next: string): Promise<void>;
}
