import { supabase } from '@/lib/supabase/client';
import type { AppUser } from '@/types';
import { fromUser, toUser } from '@/services/repositories/supabase/mappers';
import type { AuthProvider, SignUpResult } from './types';

function db() {
  if (!supabase) throw new Error('Supabase yapılandırılmamış');
  return supabase;
}

async function loadProfile(userId: string): Promise<AppUser> {
  const { data, error } = await db()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return toUser(data);
}

export const supabaseAuthProvider: AuthProvider = {
  async signIn(email, password) {
    const { data, error } = await db().auth.signInWithPassword({ email, password });
    if (error) throw new Error('E-posta veya şifre hatalı.');
    const user = data.user;
    if (!user) throw new Error('Giriş başarısız.');

    // Guard: an unverified e-mail must never reach the protected app.
    if (!user.email_confirmed_at) {
      await db().auth.signOut();
      throw new Error('E-posta adresiniz doğrulanmamış. Lütfen önce doğrulayın.');
    }

    const profile = await loadProfile(user.id);
    if (!profile.isActive) {
      await db().auth.signOut();
      throw new Error('Hesabınız pasif durumda. Yöneticinizle iletişime geçin.');
    }

    // Record the login timestamp (best-effort — never block login on this).
    try {
      await db().rpc('touch_last_login');
    } catch {
      // ignore
    }
    return { ...profile, lastLoginAt: new Date().toISOString() };
  },

  async signUp(fullName, email, password): Promise<SignUpResult> {
    const name = fullName.trim();
    const mail = email.trim().toLowerCase();
    if (!name) throw new Error('Ad soyad zorunludur.');
    if (password.trim().length < 6) throw new Error('Şifre en az 6 karakter olmalı.');

    const { data, error } = await db().auth.signUp({
      email: mail,
      password,
      // full_name lives in user metadata; the bootstrap RPC reads it server-side.
      options: { data: { full_name: name } },
    });
    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Bu e-posta zaten kayıtlı. Giriş yapmayı deneyin.');
      }
      throw new Error(error.message || 'Kayıt başarısız.');
    }
    // With e-mail confirmation enabled, no session is returned until OTP verify.
    return { needsVerification: !data.session, email: mail };
  },

  async verifyOtp(email, code) {
    const { error } = await db().auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'signup',
    });
    if (error) throw new Error('Doğrulama kodu hatalı veya süresi dolmuş.');
  },

  async resendOtp(email) {
    const { error } = await db().auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    if (error) throw new Error('Kod yeniden gönderilemedi.');
  },

  async completeAccountSetup() {
    // Idempotent: creates company/profile only if the user has none. Existing
    // accounts get their current company_id back with nothing changed.
    const { error } = await db().rpc('bootstrap_self_service_account');
    if (error) {
      if (error.message?.toLowerCase().includes('email_not_verified')) {
        throw new Error('E-posta doğrulanmadı.');
      }
      if (error.message?.toLowerCase().includes('not_authenticated')) {
        throw new Error('Oturum bulunamadı.');
      }
      throw new Error('Hesap kurulumu tamamlanamadı.');
    }
    const { data: auth } = await db().auth.getUser();
    const uid = auth.user?.id;
    if (!uid) throw new Error('Oturum bulunamadı.');
    return loadProfile(uid);
  },

  async signOut() {
    await db().auth.signOut();
  },

  async restore() {
    const { data } = await db().auth.getSession();
    const sessionUser = data.session?.user;
    if (!sessionUser?.id) return null;
    // Guard: do not restore an unverified session into the protected app.
    if (!sessionUser.email_confirmed_at) return null;
    try {
      return await loadProfile(sessionUser.id);
    } catch {
      return null;
    }
  },

  async persistProfile(patch) {
    const { data: auth } = await db().auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const row = fromUser({
      fullName: patch.fullName,
      phone: patch.phone,
      avatarUrl: patch.avatarUrl,
    });
    if (Object.keys(row).length === 0) return;
    await db().from('profiles').update(row).eq('id', uid);
  },

  async changePassword(current, next) {
    if (next.trim().length < 6) throw new Error('Yeni şifre en az 6 karakter olmalı.');
    const { data: auth } = await db().auth.getUser();
    const email = auth.user?.email;
    if (!email) throw new Error('Oturum bulunamadı.');

    // Verify the current password by re-authenticating.
    const { error: reauth } = await db().auth.signInWithPassword({
      email,
      password: current,
    });
    if (reauth) throw new Error('Mevcut şifre hatalı.');

    const { error } = await db().auth.updateUser({ password: next });
    if (error) throw new Error('Şifre güncellenemedi.');
  },
};
