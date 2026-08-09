import { useState } from 'react';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    setLoading(true);
    try {
      const mail = email.trim().toLowerCase();
      await requestPasswordReset(mail);
      router.push({ pathname: '/(auth)/reset-password', params: { email: mail } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız.');
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

      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-bold text-foreground">
          Şifrenizi mi unuttunuz?
        </Text>
        <Text className="mt-2 text-base text-muted">
          E-posta adresinizi girin, size bir sıfırlama kodu gönderelim.
        </Text>
        <View className="mt-6 gap-4">
          <Input
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="ornek@sirket.com"
          />
          {error ? <Text className="text-sm text-danger">{error}</Text> : null}
          <Button label="Kod Gönder" onPress={onSubmit} loading={loading} />
        </View>
      </View>
    </SafeAreaView>
  );
}
