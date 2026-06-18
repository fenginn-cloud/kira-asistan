import { supabase } from '@/lib/supabase/client';
import type { AppUser } from '@/types';
import { fromUser, toUser } from '@/services/repositories/supabase/mappers';
import type { AuthProvider } from './types';

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

  async signOut() {
    await db().auth.signOut();
  },

  async restore() {
    const { data } = await db().auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return null;
    try {
      return await loadProfile(userId);
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
