import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { fgColor } from '@/lib/theme/useThemeColors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { ContractForm } from '@/features/contracts/components/ContractForm';
import { emptyContractForm, formValuesToContractInput } from '@/features/contracts/form';
import { useContracts, useCreateContract } from '@/features/contracts/hooks';
import {
  contractLabel,
  findContractConflicts,
  hasConflicts,
} from '@/features/contracts/duplicates';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/store/authStore';
import type { Contract } from '@/types';

export default function NewContractScreen() {
  const router = useRouter();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const createContract = useCreateContract();
  const { data: contracts = [] } = useContracts();

  // Çakışma onayı için beklemedeki sözleşme girdisi + uyarı metni.
  const [pending, setPending] = useState<Omit<Contract, 'id' | 'createdAt'> | null>(null);
  const [conflictMsg, setConflictMsg] = useState('');

  const doCreate = (input: Omit<Contract, 'id' | 'createdAt'>) => {
    createContract.mutate(input, {
      onSuccess: () => {
        toast.success('Sözleşme oluşturuldu');
        router.back();
      },
      onError: (e) => {
        if (e instanceof Error && e.message === 'CONTRACT_LIMIT_REACHED') {
          router.replace('/(app)/paywall?reason=limit');
          return;
        }
        toast.error('Sözleşme oluşturulamadı');
      },
    });
  };

  const handleSubmit = (values: Parameters<typeof formValuesToContractInput>[0]) => {
    const input: Omit<Contract, 'id' | 'createdAt'> = {
      companyId: user?.companyId ?? 'co_1',
      assignedUserId: user?.id ?? null,
      documentUrl: null,
      ...formValuesToContractInput(values),
    };

    const conflicts = findContractConflicts(contracts, {
      propertyName: input.propertyName,
      block: input.block,
      unit: input.unit,
      tenantName: input.tenantName,
    });

    if (hasConflicts(conflicts)) {
      const parts: string[] = [];
      if (conflicts.sameUnit.length > 0) {
        parts.push(
          `Aynı mülk/dairede zaten aktif sözleşme var:\n• ${conflicts.sameUnit
            .map(contractLabel)
            .join('\n• ')}`
        );
      }
      if (conflicts.sameName.length > 0) {
        parts.push(
          `Aynı isimde sözleşme(ler) var:\n• ${conflicts.sameName
            .map(contractLabel)
            .join('\n• ')}`
        );
      }
      parts.push('Yine de yeni bir sözleşme oluşturmak istiyor musunuz?');
      setConflictMsg(parts.join('\n\n'));
      setPending(input);
      return;
    }

    doCreate(input);
  };

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
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={!!pending}
        title="Olası tekrar sözleşme"
        message={conflictMsg}
        confirmLabel="Yine de Oluştur"
        cancelLabel="Vazgeç"
        onConfirm={() => {
          const input = pending;
          setPending(null);
          if (input) doCreate(input);
        }}
        onCancel={() => setPending(null)}
      />
    </SafeAreaView>
  );
}
