import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, KeyRound } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

const RESEND_COOLDOWN = 60;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? '').toString();
  const { resetPassword, requestPasswordReset } = useAuthStore();

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const runCooldown = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    runCooldown();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (code.trim().length < 6) {
      setError('Doğrulama kodunu eksiksiz girin.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Yeni şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, code.trim(), password);
      router.replace('/(auth)/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Şifre sıfırlanamadı.');
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    try {
      await requestPasswordReset(email);
      setInfo('Yeni kod gönderildi.');
      setCooldown(RESEND_COOLDOWN);
      runCooldown();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kod yeniden gönderilemedi.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <KeyRound size={28} color={fgColor()} />
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">
              Yeni şifre belirle
            </Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {email
                ? `${email} adresine gönderdiğimiz kodu ve yeni şifrenizi girin.`
                : 'E-postanıza gönderdiğimiz kodu ve yeni şifrenizi girin.'}
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label="Doğrulama Kodu"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
              placeholder="------"
              className="text-center text-2xl tracking-[10px]"
            />
            <Input
              label="Yeni Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="En az 6 karakter"
            />
            <Input
              label="Yeni Şifre (Tekrar)"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
            />

            {error ? <Text className="text-sm text-danger">{error}</Text> : null}
            {info ? <Text className="text-sm text-success">{info}</Text> : null}

            <View className="mt-2">
              <Button label="Şifreyi Güncelle" onPress={onSubmit} loading={loading} />
            </View>

            <View className="mt-2 flex-row items-center justify-center gap-1">
              {cooldown > 0 ? (
                <Text className="text-sm text-muted">
                  Kodu yeniden gönder ({cooldown} sn)
                </Text>
              ) : (
                <Pressable onPress={onResend}>
                  <Text className="text-sm font-semibold text-primary-700">
                    Kodu yeniden gönder
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
