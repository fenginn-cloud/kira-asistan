import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, MailCheck } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-6 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color="#0B1220" />
        </Pressable>
      </View>

      <View className="flex-1 justify-center px-6">
        {sent ? (
          <View className="items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-success-soft">
              <MailCheck size={28} color="#16A34A" />
            </View>
            <Text className="mt-4 text-xl font-bold text-[#0B1220]">
              Bağlantı gönderildi
            </Text>
            <Text className="mt-2 text-center text-sm text-muted">
              {email} adresine şifre sıfırlama bağlantısı gönderdik.
            </Text>
            <View className="mt-8 w-full">
              <Button label="Girişe Dön" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <>
            <Text className="text-2xl font-bold text-[#0B1220]">
              Şifrenizi mi unuttunuz?
            </Text>
            <Text className="mt-2 text-base text-muted">
              E-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.
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
              <Button
                label="Bağlantı Gönder"
                onPress={() => setSent(true)}
                disabled={!email.trim()}
              />
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
