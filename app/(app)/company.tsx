import { fgColor } from '@/lib/theme/useThemeColors';
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
import { ArrowLeft, Building, Lock } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import {
  CompanySettingsForm,
  companyToFormValues,
} from '@/features/company/CompanySettingsForm';
import { useCompany, useUpdateCompany } from '@/features/users/hooks';
import { useAuthStore } from '@/store/authStore';

export default function CompanyScreen() {
  const router = useRouter();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const { data: company, isLoading } = useCompany();
  const updateCompany = useUpdateCompany();

  const isSuperAdmin = role === 'super_admin';

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
          <Text className="text-2xl font-bold text-foreground">Şirket Ayarları</Text>
        </View>

        <ScrollView
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isSuperAdmin ? (
            <EmptyState
              icon={Lock}
              title="Erişim yetkiniz yok"
              description="Şirket ayarlarını yalnızca Super Admin düzenleyebilir."
            />
          ) : isLoading || !company ? (
            <View className="gap-3 pt-4">
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : (
            <>
              <View className="mt-4 items-center">
                <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
                  <Building size={34} color="#2563EB" />
                </View>
                <Pressable
                  onPress={() => toast.show('Logo yükleme Storage fazında aktif olacak', 'info')}
                  className="mt-3"
                >
                  <Text className="text-sm font-semibold text-primary-700">Logo Yükle</Text>
                </Pressable>
              </View>

              <SectionHeader title="Şirket Bilgileri" />
              <Card>
                <CompanySettingsForm
                  defaultValues={companyToFormValues(company)}
                  submitting={updateCompany.isPending}
                  onSubmit={(values) =>
                    updateCompany.mutate(
                      {
                        name: values.name,
                        phone: values.phone || null,
                        email: values.email || null,
                        address: values.address || null,
                        taxOffice: values.taxOffice || null,
                        taxNumber: values.taxNumber || null,
                        currency: values.currency,
                        defaultNotificationDays: values.defaultNotificationDays,
                      },
                      { onSuccess: () => toast.success('Şirket bilgileri kaydedildi') }
                    )
                  }
                />
              </Card>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
