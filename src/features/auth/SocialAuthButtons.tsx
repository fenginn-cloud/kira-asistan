import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { authProvider } from '@/services/auth';
import type { OAuthProviderId } from '@/services/auth/types';
import { useAuthStore } from '@/store/authStore';
import { useThemeColors } from '@/lib/theme/useThemeColors';

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </Svg>
  );
}

function AppleLogo({ color }: { color: string }) {
  return (
    <Svg width={18} height={20} viewBox="0 0 814 1000">
      <Path
        fill={color}
        d="M788 341c-6 4-108 62-108 190 0 148 130 200 134 202-1 3-21 72-69 142-43 62-88 124-157 124s-87-40-166-40c-77 0-104 41-167 41s-107-57-158-128C38 788 0 683 0 583 0 422 105 337 208 337c55 0 101 36 135 36 33 0 84-38 147-38 24 0 109 2 165 82zM555 165c26-31 44-74 44-117 0-6 0-12-1-17-42 2-92 28-122 63-24 27-46 70-46 114 0 7 1 13 2 15 3 1 7 1 11 1 38 0 86-25 112-59z"
      />
    </Svg>
  );
}

/** Sağlayıcıdan dönüşte URL'de hata varsa okunur (ör. kullanıcı vazgeçti). */
function oauthErrorFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const params = new URLSearchParams(
    `${window.location.search.slice(1)}&${window.location.hash.replace(/^#/, '')}`
  );
  const code = params.get('error');
  if (!code) return null;
  return code === 'access_denied'
    ? 'Giriş iptal edildi.'
    : 'Giriş tamamlanamadı. Lütfen tekrar deneyin.';
}

/**
 * "Google ile devam et" / "Apple ile devam et". Şimdilik YALNIZCA web'de
 * görünür (mobil uygulama sonraki sürümde). Apple kuralı (4.8) gereği Google
 * ile birlikte Apple seçeneği de sunulur.
 */
export function SocialAuthButtons() {
  const colors = useThemeColors();
  const signInWithOAuth = useAuthStore((s) => s.signInWithOAuth);
  const [busy, setBusy] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(oauthErrorFromUrl());
  }, []);

  if (!authProvider.oauthAvailable) return null;

  const start = async (p: OAuthProviderId) => {
    setError(null);
    setBusy(p);
    try {
      await signInWithOAuth(p); // sayfa sağlayıcıya yönlenir
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş başlatılamadı.');
      setBusy(null);
    }
  };

  return (
    <View className="gap-3">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
        <Text className="text-xs text-muted">veya</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={!!busy}
        onPress={() => start('google')}
        className="h-12 flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-surface active:opacity-80"
      >
        {busy === 'google' ? <ActivityIndicator size="small" /> : <GoogleLogo />}
        <Text className="text-base font-semibold text-foreground">Google ile devam et</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={!!busy}
        onPress={() => start('apple')}
        className={`h-12 flex-row items-center justify-center gap-3 rounded-2xl active:opacity-80 ${
          colors.isDark ? 'bg-white' : 'bg-black'
        }`}
      >
        {busy === 'apple' ? (
          <ActivityIndicator size="small" color={colors.isDark ? '#000' : '#fff'} />
        ) : (
          <AppleLogo color={colors.isDark ? '#000000' : '#FFFFFF'} />
        )}
        <Text className={`text-base font-semibold ${colors.isDark ? 'text-black' : 'text-white'}`}>
          Apple ile devam et
        </Text>
      </Pressable>

      {error ? <Text className="text-center text-xs text-danger">{error}</Text> : null}
    </View>
  );
}
