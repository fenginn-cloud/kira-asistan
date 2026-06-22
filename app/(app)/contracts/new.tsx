import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { ContractForm } from '@/features/contracts/components/ContractForm';
import { emptyContractForm, formValuesToContractInput } from '@/features/contracts/form';
import { useCreateContract } from '@/features/contracts/hooks';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';

export default function NewContractScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const createContract = useCreateContract();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Text className="text-2xl font-bold text-foreground">Yeni Sözleşme</Text>
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <X size={24} color={fgColor()} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ContractForm
            defaultValues={emptyContractForm}
            submitLabel="Sözleşmeyi Kaydet"
            submitting={createContract.isPending}
            onSubmit={(values) =>
              createContract.mutate(
                {
                  companyId: user?.companyId ?? 'co_1',
                  assignedUserId: user?.id ?? null,
                  documentUrl: null,
                  ...formValuesToContractInput(values),
                },
                {
                  onSuccess: () => {
                    toast.success('Sözleşme oluşturuldu');
                    router.back();
                  },
                }
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
