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
import { Link, useRouter, type Href } from 'expo-router';
import { Building2, Check } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading, rememberMe, setRememberMe } = useAuthStore();
  const [email, setEmail] = useState('admin@vista.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    try {
      await signIn(email, password);
      router.replace('/(app)/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş yapılamadı.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary">
              <Building2 size={36} color="#FFFFFF" />
            </View>
            <Text className="mt-5 text-3xl font-bold text-foreground">
              Kira Asistan
            </Text>
            <Text className="mt-1 text-base text-muted">
              Hesabınıza giriş yapın
            </Text>
          </View>

          <View className="gap-4">
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
              placeholder="••••••••"
            />

            {error ? (
              <Text className="text-sm text-danger">{error}</Text>
            ) : null}

            <View className="flex-row items-center justify-between">
              <Pressable
                onPress={() => setRememberMe(!rememberMe)}
                className="flex-row items-center gap-2"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-md border ${
                    rememberMe ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {rememberMe ? <Check size={14} color="#FFFFFF" /> : null}
                </View>
                <Text className="text-sm text-foreground">Beni Hatırla</Text>
              </Pressable>

              <Link href="/(auth)/forgot-password" asChild>
                <Pressable>
                  <Text className="text-sm font-semibold text-primary-700">
                    Şifremi Unuttum
                  </Text>
                </Pressable>
              </Link>
            </View>

            <View className="mt-2">
              <Button label="Giriş Yap" onPress={onSubmit} loading={isLoading} />
            </View>
          </View>

          <View className="mt-10 flex-row flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href={'/yasal/gizlilik' as Href} asChild>
              <Pressable>
                <Text className="text-xs text-muted">Gizlilik Politikası</Text>
              </Pressable>
            </Link>
            <Link href={'/yasal/kullanim' as Href} asChild>
              <Pressable>
                <Text className="text-xs text-muted">Kullanım Şartları</Text>
              </Pressable>
            </Link>
            <Link href={'/yasal/kvkk' as Href} asChild>
              <Pressable>
                <Text className="text-xs text-muted">KVKK</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
