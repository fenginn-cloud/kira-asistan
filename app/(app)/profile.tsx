import { fgColor } from '@/lib/theme/useThemeColors';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { ProfileForm } from '@/features/profile/ProfileForm';
import { ChangePasswordForm } from '@/features/profile/ChangePasswordForm';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useState } from 'react';

/** Profil avatarı için hazır emoji/hayvan seçenekleri (fotoğraf yükleme yok). */
const AVATAR_EMOJIS = [
  '🐯', '🦁', '🦊', '🐶', '🐱', '🐼',
  '🐨', '🐵', '🦉', '🦜', '🐧', '🦋',
  '🐢', '🐬', '🦄', '🐝', '🐺', '🐰',
  '🐸', '🐷', '🦈', '🦖', '🐙', '🦩',
];

export default function ProfileScreen() {
  const router = useRouter();
  const toast = useToast();
  const { user, updateProfile, changePassword, deleteAccount } = useAuthStore();
  const avatarEmoji = useSettingsStore((s) => s.avatarEmoji);
  const setAvatarEmoji = useSettingsStore((s) => s.setAvatarEmoji);
  const [savingPassword, setSavingPassword] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setDeleteOpen(false);
      toast.success('Hesabınız silindi');
      router.replace('/(auth)/login');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hesap silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-row items-center gap-2 px-5 pt-2">
          <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
            <ArrowLeft size={24} color={fgColor()} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Profilim</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mt-4 items-center">
            <Avatar name={user.fullName} size={84} emoji={avatarEmoji} />
            <Pressable onPress={() => setAvatarPickerOpen(true)} className="mt-3">
              <Text className="text-sm font-semibold text-primary-700">Avatar Seç</Text>
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

          <SectionHeader title="Hesap" />
          <Card>
            <Text className="text-sm font-semibold text-foreground">Hesabı Sil</Text>
            <Text className="mt-1 text-xs leading-5 text-muted">
              Hesabınız ve tüm verileriniz (sözleşmeler, kiracılar, ödemeler, belgeler) kalıcı olarak
              silinir. Bu işlem geri alınamaz.
            </Text>
            <Pressable
              onPress={() => setDeleteOpen(true)}
              className="mt-4 h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-danger-soft active:opacity-80"
            >
              <Trash2 size={17} color="#dc2626" />
              <Text className="text-sm font-bold text-danger">Hesabımı Sil</Text>
            </Pressable>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={deleteOpen}
        destructive
        loading={deleting}
        title="Hesabınızı silmek istiyor musunuz?"
        message="Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz."
        confirmLabel="Evet, hesabımı sil"
        cancelLabel="Vazgeç"
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteOpen(false)}
      />

      <Modal
        visible={avatarPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarPickerOpen(false)}
      >
        <Pressable
          onPress={() => setAvatarPickerOpen(false)}
          className="flex-1 items-center justify-center bg-black/40 px-6"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-surface p-5"
          >
            <Text className="text-center text-lg font-bold text-foreground">Avatar Seç</Text>
            <Text className="mt-1 text-center text-sm text-muted">
              Bir simge seçin veya baş harflerinize dönün.
            </Text>

            <View className="mt-5 flex-row flex-wrap justify-center gap-3">
              {AVATAR_EMOJIS.map((e) => {
                const selected = avatarEmoji === e;
                return (
                  <Pressable
                    key={e}
                    onPress={() => {
                      setAvatarEmoji(e);
                      setAvatarPickerOpen(false);
                      toast.success('Avatar güncellendi');
                    }}
                    className={`h-14 w-14 items-center justify-center rounded-full ${
                      selected ? 'bg-primary-100 border-2 border-primary' : 'bg-background'
                    }`}
                  >
                    <Text style={{ fontSize: 30 }}>{e}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                setAvatarEmoji(null);
                setAvatarPickerOpen(false);
                toast.success('Baş harflere dönüldü');
              }}
              className="mt-6 h-12 items-center justify-center rounded-2xl bg-background active:opacity-80"
            >
              <Text className="text-base font-semibold text-muted">Baş Harfleri Kullan</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
