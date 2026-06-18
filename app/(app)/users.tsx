import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Plus, X } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useUsers, useCreateUser, useUpdateUser } from '@/features/users/hooks';
import { useAuthStore } from '@/store/authStore';
import { errorMessage } from '@/lib/utils/error';
import { formatDateTime } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';
import type { AppUser, UserRole } from '@/types';

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Süper Admin',
  admin: 'Yönetici',
  personnel: 'Personel',
};

interface Draft {
  id: string | null;
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyDraft: Draft = {
  id: null,
  fullName: '',
  email: '',
  password: '',
  role: 'personnel',
};

export default function UsersScreen() {
  const router = useRouter();
  const toast = useToast();
  const currentUser = useAuthStore((s) => s.user);
  const { data: users = [], isLoading } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [draft, setDraft] = useState<Draft | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const roleOptions: UserRole[] = isSuperAdmin
    ? ['admin', 'personnel', 'super_admin']
    : ['admin', 'personnel'];

  const save = () => {
    if (!draft) return;
    if (!draft.fullName.trim() || !draft.email.trim()) {
      toast.error('Ad soyad ve e-posta zorunludur.');
      return;
    }
    if (draft.id) {
      updateUser.mutate(
        { id: draft.id, patch: { fullName: draft.fullName, role: draft.role } },
        {
          onSuccess: () => {
            toast.success('Kullanıcı güncellendi');
            setDraft(null);
          },
          onError: (e) => toast.error(errorMessage(e, 'Kullanıcı güncellenemedi')),
        }
      );
    } else {
      if (draft.password.trim().length < 6) {
        toast.error('Şifre en az 6 karakter olmalı.');
        return;
      }
      createUser.mutate(
        {
          companyId: currentUser?.companyId ?? 'co_1',
          email: draft.email,
          password: draft.password,
          fullName: draft.fullName,
          role: draft.role,
          isActive: true,
          phone: null,
          avatarUrl: null,
          lastLoginAt: null,
        },
        {
          onSuccess: () => {
            toast.success('Kullanıcı oluşturuldu');
            setDraft(null);
          },
          onError: (e) => toast.error(errorMessage(e, 'Kullanıcı oluşturulamadı')),
        }
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
            <ArrowLeft size={24} color="#0B1220" />
          </Pressable>
          <Text className="text-2xl font-bold text-[#0B1220]">Kullanıcılar</Text>
        </View>
        <Pressable
          onPress={() => setDraft(emptyDraft)}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-primary active:opacity-80"
        >
          <Plus size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pt-4 pb-10 gap-3"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : users.length === 0 ? (
          <EmptyState icon={Plus} title="Henüz kullanıcı yok" />
        ) : (
          users.map((u) => (
            <UserRow
              key={u.id}
              user={u}
              isSelf={u.id === currentUser?.id}
              onEdit={() =>
                setDraft({
                  id: u.id,
                  fullName: u.fullName,
                  email: u.email,
                  password: '',
                  role: u.role,
                })
              }
              onToggleActive={(value) =>
                updateUser.mutate(
                  { id: u.id, patch: { isActive: value } },
                  {
                    onSuccess: () => toast.success(value ? 'Aktife alındı' : 'Pasife alındı'),
                    onError: (e) => toast.error(errorMessage(e, 'Güncellenemedi')),
                  }
                )
              }
            />
          ))
        )}
      </ScrollView>

      {/* Add / Edit modal */}
      <Modal visible={draft !== null} transparent animationType="slide" onRequestClose={() => setDraft(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-3xl bg-surface p-5 pb-10">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#0B1220]">
                {draft?.id ? 'Kullanıcıyı Düzenle' : 'Kullanıcı Ekle'}
              </Text>
              <Pressable onPress={() => setDraft(null)} className="h-8 w-8 items-center justify-center">
                <X size={22} color="#6B7280" />
              </Pressable>
            </View>
            {draft ? (
              <View className="gap-3">
                <Input
                  label="Ad Soyad"
                  value={draft.fullName}
                  onChangeText={(v) => setDraft({ ...draft, fullName: v })}
                />
                <Input
                  label="E-posta"
                  value={draft.email}
                  editable={!draft.id}
                  onChangeText={(v) => setDraft({ ...draft, email: v })}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {!draft.id ? (
                  <Input
                    label="Geçici Şifre (en az 6 karakter)"
                    value={draft.password}
                    onChangeText={(v) => setDraft({ ...draft, password: v })}
                    secureTextEntry
                    placeholder="••••••••"
                  />
                ) : null}
                <Text className="text-sm font-medium text-muted">Rol</Text>
                <View className="flex-row flex-wrap gap-2">
                  {roleOptions.map((r) => {
                    const active = draft.role === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setDraft({ ...draft, role: r })}
                        className={`rounded-2xl px-4 py-3 ${active ? 'bg-primary' : 'bg-background'}`}
                      >
                        <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}>
                          {ROLE_LABEL[r]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View className="mt-2">
                  <Button
                    label={draft.id ? 'Değişiklikleri Kaydet' : 'Kullanıcı Oluştur'}
                    onPress={save}
                    loading={createUser.isPending || updateUser.isPending}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function UserRow({
  user,
  isSelf,
  onEdit,
  onToggleActive,
}: {
  user: AppUser;
  isSelf: boolean;
  onEdit: () => void;
  onToggleActive: (value: boolean) => void;
}) {
  return (
    <Pressable onPress={onEdit}>
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={user.fullName} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-[#0B1220]">
              {user.fullName}
              {isSelf ? ' (Siz)' : ''}
            </Text>
            <Text className="text-sm text-muted">{user.email}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="rounded-full bg-primary-50 px-2 py-0.5">
                <Text className="text-xs font-semibold text-primary-700">
                  {ROLE_LABEL[user.role]}
                </Text>
              </View>
              {user.lastLoginAt ? (
                <View className="flex-row items-center gap-1">
                  <Clock size={11} color={palette.muted} />
                  <Text className="text-xs text-muted">{formatDateTime(user.lastLoginAt)}</Text>
                </View>
              ) : (
                <Text className="text-xs text-muted">Hiç giriş yapmadı</Text>
              )}
            </View>
          </View>
          <View className="items-end">
            <Text className="mb-1 text-xs text-muted">{user.isActive ? 'Aktif' : 'Pasif'}</Text>
            <Switch
              value={user.isActive}
              disabled={isSelf}
              onValueChange={onToggleActive}
              trackColor={{ true: palette.primary, false: palette.border }}
            />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
