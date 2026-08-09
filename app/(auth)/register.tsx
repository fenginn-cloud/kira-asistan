import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { ArrowLeft, Building2 } from 'lucide-react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();
  const signUp = useAuthStore((s) => s.signUp);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError('Ad soyad zorunludur.');
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (password.trim().length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const mail = email.trim().toLowerCase();
      await signUp(fullName, mail, password);
      router.push({ pathname: '/(auth)/verify-otp', params: { email: mail } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt yapılamadı.');
    } finally {
      setLoading(false);
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
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
              <Building2 size={36} color="#FFFFFF" />
            </View>
            <Text className="mt-5 text-3xl font-bold text-foreground">
              Hesap Oluştur
            </Text>
            <Text className="mt-1 text-base text-muted">
              Birkaç adımda başlayın
            </Text>
          </View>

          <View className="gap-4">
            <Input
              label="Ad Soyad"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholder="Ad Soyad"
            />
            <Input
              label="E-posta"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="ornek@sirket.com"
            />
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="En az 6 karakter"
            />
            <Input
              label="Şifre Tekrar"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              placeholder="••••••••"
            />

            {error ? <Text className="text-sm text-danger">{error}</Text> : null}

            <View className="mt-2">
              <Button label="Kayıt Ol" onPress={onSubmit} loading={loading} />
            </View>

            <View className="mt-2 flex-row items-center justify-center gap-1">
              <Text className="text-sm text-muted">Zaten hesabınız var mı?</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text className="text-sm font-semibold text-primary-700">
                    Giriş Yap
                  </Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
