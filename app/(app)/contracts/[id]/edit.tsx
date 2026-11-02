import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View, ScrollView } from 'react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { ContractForm } from '@/features/contracts/components/ContractForm';
import { contractToFormValues, formValuesToContractInput } from '@/features/contracts/form';
import { useApplyRentChange, useContract, useUpdateContract } from '@/features/contracts/hooks';
import { errorMessage } from '@/lib/utils/error';
import { monthStart } from '@/lib/ledger/accrual';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { FileText } from 'lucide-react-native';

export default function EditContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: contract, isLoading } = useContract(id);
  const updateContract = useUpdateContract();
  const applyRentChange = useApplyRentChange();
  const [saving, setSaving] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Text className="text-2xl font-bold text-foreground">Sözleşmeyi Düzenle</Text>
          <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
            <X size={24} color={fgColor()} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerClassName="px-5 pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="gap-3 pt-4">
              <CardSkeleton />
              <CardSkeleton />
            </View>
          ) : !contract ? (
            <EmptyState icon={FileText} title="Sözleşme bulunamadı" />
          ) : (
            <ContractForm
              defaultValues={contractToFormValues(contract)}
              submitLabel="Değişiklikleri Kaydet"
              mode="edit"
              submitting={saving}
              onSubmit={async (values) => {
                const patch = formValuesToContractInput(values);
                const rentChanged =
                  values.rentAmount !== contract.rentAmount ||
                  values.duesAmount !== contract.duesAmount;
                setSaving(true);
                try {
                  if (rentChanged) {
                    // Kira değişikliği seçilen aydan itibaren uygulanır; geçmiş korunur.
                    const { rentAmount: _r, duesAmount: _d, ...rest } = patch;
                    await updateContract.mutateAsync({ id: contract.id, patch: rest });
                    await applyRentChange.mutateAsync({
                      id: contract.id,
                      input: {
                        effectiveMonth: values.rentEffectiveMonth || monthStart(new Date()),
                        rentAmount: values.rentAmount,
                        duesAmount: values.duesAmount,
                      },
                    });
                  } else {
                    await updateContract.mutateAsync({ id: contract.id, patch });
                  }
                  toast.success('Sözleşme güncellendi');
                  router.back();
                } catch (e) {
                  toast.error(errorMessage(e, 'Güncellenemedi'));
                } finally {
                  setSaving(false);
                }
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
