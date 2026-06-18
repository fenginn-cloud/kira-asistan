import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, updateProfile, changePassword } = useAuthStore();
  const [savingPassword, setSavingPassword] = useState(false);

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-2 px-5 pt-2">
          <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
            <ArrowLeft size={24} color="#0B1220" />
          </Pressable>
          <Text className="text-2xl font-bold text-[#0B1220]">Profilim</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-4 items-center">
            <Avatar name={user.fullName} size={84} />
            <Pressable
              onPress={() => toast.show('Fotoğraf yükleme Storage fazında aktif olacak', 'info')}
              className="mt-3"
            >
              <Text className="text-sm font-semibold text-primary-700">
                Fotoğrafı Değiştir
              </Text>
            </Pressable>
          </View>

          <SectionHeader title="Kişisel Bilgiler" />
          <Card>
            <ProfileForm
              defaultValues={{
                fullName: user.fullName,
                phone: user.phone ?? '',
                email: user.email,
              }}
              onSubmit={(values) => {
                updateProfile({
                  fullName: values.fullName,
                  phone: values.phone || null,
                  email: values.email,
                });
                toast.success('Profil güncellendi');
              }}
            />
          </Card>

          <SectionHeader title="Şifre Değiştir" />
          <Card>
            <ChangePasswordForm
              submitting={savingPassword}
              onSubmit={async (current, next) => {
                setSavingPassword(true);
                try {
                  await changePassword(current, next);
                  toast.success('Şifre güncellendi');
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Şifre güncellenemedi');
                } finally {
                  setSavingPassword(false);
                }
              }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
