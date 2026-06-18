import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  MessageSquareText,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ContractBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { ActionSheet, type ActionSheetItem } from '@/components/ui/ActionSheet';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useToast } from '@/components/ui/Toast';
import { InfoRow } from '@/features/contracts/components/InfoRow';
import { MessageModal } from '@/features/contracts/components/MessageModal';
import { PaymentItem } from '@/features/payments/components/PaymentItem';
import { TransactionItem } from '@/features/payments/components/TransactionItem';
import {
  AddTransactionModal,
  type AddTransactionInput,
} from '@/features/payments/components/AddTransactionModal';
import {
  useContract,
  useDeleteContract,
  useUpdateContract,
} from '@/features/contracts/hooks';
import {
  usePaymentsByContract,
  useAddTransaction,
  useContractTransactions,
} from '@/features/payments/hooks';
import { useAuthStore } from '@/store/authStore';
import {
  getDocumentViewUrl,
  removeContractDocument,
  uploadContractDocument,
  uploadReceipt,
} from '@/services/storage';
import { buildMessage } from '@/lib/utils/message';
import { callPhone } from '@/lib/utils/contact';
import { errorMessage } from '@/lib/utils/error';
import { formatCurrency, formatShortDate } from '@/lib/utils/format';
import { derivePaymentStatus } from '@/lib/utils/payments';
import { palette } from '@/lib/theme/colors';
import type { Payment } from '@/types';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'admin' || role === 'super_admin';

  const { data: contract, isLoading } = useContract(id);
  const { data: payments = [] } = usePaymentsByContract(id);
  const { data: transactions = [] } = useContractTransactions(id);
  const addTransaction = useAddTransaction(id);
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [messageOpen, setMessageOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  // The most relevant unpaid period drives the reminder message.
  const outstanding = useMemo(
    () => payments.find((p) => p.status === 'overdue' || p.status === 'partial') ?? payments[0],
    [payments]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="gap-3 p-5">
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (!contract) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <EmptyState icon={FileText} title="Sözleşme bulunamadı" />
      </SafeAreaView>
    );
  }

  const location = [contract.block, contract.unit].filter(Boolean).join(' / ');

  const setStatus = (status: 'active' | 'passive', label: string) => {
    updateContract.mutate(
      { id: contract.id, patch: { status } },
      { onSuccess: () => toast.success(label) }
    );
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    try {
      const documentUrl = await uploadContractDocument({
        companyId: contract.companyId,
        contractId: contract.id,
        fileUri: asset.uri,
        fileName: asset.name ?? 'sozlesme.pdf',
        mimeType: asset.mimeType,
      });
      updateContract.mutate(
        { id: contract.id, patch: { documentUrl } },
        { onSuccess: () => toast.success('PDF yüklendi') }
      );
    } catch {
      toast.error('PDF yüklenemedi');
    }
  };

  const handleViewDocument = async () => {
    if (!contract.documentUrl) return;
    try {
      const url = await getDocumentViewUrl(contract.documentUrl);
      Linking.openURL(url);
    } catch {
      toast.error('PDF açılamadı');
    }
  };

  const handleRemoveDocument = () => {
    const current = contract.documentUrl;
    updateContract.mutate(
      { id: contract.id, patch: { documentUrl: null } },
      {
        onSuccess: () => {
          if (current) void removeContractDocument(current);
          toast.success('PDF kaldırıldı');
        },
      }
    );
  };

  const handleAddPayment = async (input: AddTransactionInput) => {
    if (!activePayment) return;
    setSavingPayment(true);
    try {
      let receiptUrl: string | null = null;
      if (input.receipt) {
        receiptUrl = await uploadReceipt({
          companyId: contract.companyId,
          fileUri: input.receipt.uri,
          fileName: input.receipt.name,
          mimeType: input.receipt.mimeType,
        });
      }
      await addTransaction.mutateAsync({
        paymentId: activePayment.id,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        description: input.description,
        receiptUrl,
      });
      setActivePayment(null);
      toast.success('Ödeme kaydedildi');
    } catch (e) {
      console.warn('Ödeme kaydı hatası:', e);
      toast.error(errorMessage(e, 'Ödeme kaydedilemedi'));
    } finally {
      setSavingPayment(false);
    }
  };

  const actionItems: ActionSheetItem[] = [
    {
      label: 'Düzenle',
      icon: Pencil,
      onPress: () => router.push(`/(app)/contracts/${contract.id}/edit`),
    },
    contract.status === 'active'
      ? { label: 'Pasife Al', icon: PauseCircle, onPress: () => setStatus('passive', 'Sözleşme pasife alındı') }
      : { label: 'Aktife Al', icon: CheckCircle2, onPress: () => setStatus('active', 'Sözleşme aktife alındı') },
    ...(canDelete
      ? [{ label: 'Sil', icon: Trash2, destructive: true, onPress: () => setConfirmDelete(true) }]
      : []),
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable onPress={() => router.back()} className="h-10 w-10 justify-center">
          <ArrowLeft size={24} color="#0B1220" />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <ContractBadge status={contract.status} />
          <Pressable
            onPress={() => setActionsOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <MoreHorizontal size={22} color="#0B1220" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-2">
          <Text className="text-2xl font-bold text-[#0B1220]">
            {contract.propertyName}
          </Text>
          <Text className="text-base text-muted">
            {location ? `${location} • ` : ''}
            {formatCurrency(contract.rentAmount)} / ay
          </Text>
        </View>

        {/* Quick actions */}
        <View className="mt-4 flex-row gap-2">
          <View className="flex-1">
            <Button
              label="Mesaj"
              icon={MessageSquareText}
              variant="secondary"
              size="md"
              onPress={() => setMessageOpen(true)}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Ara"
              icon={Phone}
              variant="secondary"
              size="md"
              onPress={() => callPhone(contract.tenantPhone)}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Ödeme"
              icon={Plus}
              size="md"
              onPress={() => setActivePayment(outstanding ?? null)}
            />
          </View>
        </View>

        {/* Tenant */}
        <SectionHeader title="Kiracı" />
        <Card>
          <InfoRow label="Ad Soyad" value={contract.tenantName} />
          <InfoRow label="Telefon" value={contract.tenantPhone} />
          <InfoRow
            label="TC Kimlik"
            value={contract.tenantNationalId ?? '—'}
            last
          />
        </Card>

        {/* Owner */}
        <SectionHeader title="Mülk Sahibi" />
        <Card>
          <InfoRow label="Ad Soyad" value={contract.ownerName} />
          <InfoRow label="Telefon" value={contract.ownerPhone} last />
        </Card>

        {/* Financials */}
        <SectionHeader title="Finansal" />
        <Card>
          <InfoRow label="Kira Bedeli" value={formatCurrency(contract.rentAmount)} />
          <InfoRow label="Aidat" value={formatCurrency(contract.duesAmount)} />
          <InfoRow label="Depozito" value={formatCurrency(contract.depositAmount)} last />
        </Card>

        {/* Contract terms */}
        <SectionHeader title="Sözleşme" />
        <Card>
          <InfoRow label="Başlangıç" value={formatShortDate(contract.startDate)} />
          <InfoRow
            label="Bitiş"
            value={contract.endDate ? formatShortDate(contract.endDate) : '—'}
          />
          <InfoRow label="Ödeme Günü" value={`Her ayın ${contract.paymentDay}.`} />
          <InfoRow label="Notlar" value={contract.notes ?? '—'} last />
        </Card>

        {/* Document */}
        <SectionHeader title="Sözleşme Dosyası" />
        <Card>
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
              <FileText size={20} color={palette.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-[#0B1220]">
                {contract.documentUrl ? 'Sözleşme.pdf' : 'PDF Yükle'}
              </Text>
              <Text className="text-sm text-muted">
                {contract.documentUrl ? 'Görüntüle veya kaldır' : 'Henüz dosya yok'}
              </Text>
            </View>
          </View>

          {contract.documentUrl ? (
            <View className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
              <Pressable
                onPress={handleViewDocument}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
              >
                <Eye size={16} color={palette.primary} />
                <Text className="text-xs font-semibold text-primary-700">Görüntüle</Text>
              </Pressable>
              <Pressable
                onPress={handleRemoveDocument}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-danger-soft py-2.5 active:opacity-80"
              >
                <Trash2 size={16} color={palette.danger} />
                <Text className="text-xs font-semibold text-danger">Kaldır</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickDocument}
              className="mt-3 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
            >
              <Upload size={16} color={palette.primary} />
              <Text className="text-xs font-semibold text-primary-700">PDF Seç ve Yükle</Text>
            </Pressable>
          )}
        </Card>

        {/* Payments */}
        <SectionHeader title="Ödeme Geçmişi" />
        {payments.length === 0 ? (
          <EmptyState icon={FileText} title="Ödeme kaydı yok" />
        ) : (
          <View className="gap-3">
            {payments.map((p) => (
              <PaymentItem
                key={p.id}
                payment={p}
                onPress={() => setActivePayment(p)}
              />
            ))}
          </View>
        )}

        {/* Collected transactions (with receipts) */}
        {transactions.length > 0 ? (
          <>
            <SectionHeader title="Tahsilatlar" />
            <View className="gap-3">
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Modals */}
      <MessageModal
        visible={messageOpen}
        message={
          outstanding
            ? buildMessage(
                derivePaymentStatus(outstanding) === 'overdue' ? 'overdue' : 'upcoming',
                contract,
                outstanding
              )
            : 'Güncel borç bulunmuyor.'
        }
        phone={contract.tenantPhone}
        onClose={() => setMessageOpen(false)}
      />
      <AddTransactionModal
        visible={activePayment !== null}
        payment={activePayment}
        isSubmitting={savingPayment}
        onClose={() => setActivePayment(null)}
        onSubmit={handleAddPayment}
      />

      <ActionSheet
        visible={actionsOpen}
        title="Sözleşme İşlemleri"
        items={actionItems}
        onClose={() => setActionsOpen(false)}
      />
      <ConfirmModal
        visible={confirmDelete}
        title="Sözleşmeyi sil"
        message="Bu sözleşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmLabel="Sil"
        destructive
        loading={deleteContract.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          deleteContract.mutate(contract.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              toast.success('Sözleşme silindi');
              router.back();
            },
          })
        }
      />
    </SafeAreaView>
  );
}
