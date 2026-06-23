import { useEffect, useMemo, useRef, useState } from 'react';
import { fgColor } from '@/lib/theme/useThemeColors';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft,
  CalendarX2,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Link2,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
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
import { LedgerRowCard } from '@/features/payments/components/LedgerRowCard';
import { ContractBalanceCard } from '@/features/payments/components/ContractBalanceCard';
import {
  AddTransactionModal,
  type AddTransactionInput,
} from '@/features/payments/components/AddTransactionModal';
import {
  useContract,
  useContractToken,
  useDeleteContract,
  useUpdateContract,
} from '@/features/contracts/hooks';
import {
  usePaymentsByContract,
  useAddTransaction,
  useContractTransactions,
  useDeleteTransaction,
  useEnsureRecentPayments,
  usePendingClaims,
  useApproveClaim,
  useRejectClaim,
  useSetMonthlyPaid,
} from '@/features/payments/hooks';
import { useAuthStore } from '@/store/authStore';
import {
  getDocumentViewUrl,
  removeContractDocument,
  uploadContractDocument,
  uploadReceipt,
} from '@/services/storage';
import { buildMessage } from '@/lib/utils/message';
import { callPhone, copyText, openWhatsApp } from '@/lib/utils/contact';
import { tenantLinkFor } from '@/services/tenantPortal';
import { errorMessage } from '@/lib/utils/error';
import { formatCurrency, formatMonth, formatShortDate } from '@/lib/utils/format';
import { derivePaymentStatus } from '@/lib/utils/payments';
import { recentPeriodCutoff } from '@/lib/utils/paymentPeriods';
import { generateLedgerRows, getContractBalance } from '@/lib/ledger/ledger';
import { daysUntilEnd, expiryLabel } from '@/lib/utils/contractExpiry';
import { palette } from '@/lib/theme/colors';
import type { Payment, PaymentTransaction } from '@/types';

type Tab = 'genel' | 'odemeler' | 'cari';

const TABS: { key: Tab; label: string }[] = [
  { key: 'genel', label: 'Genel' },
  { key: 'odemeler', label: 'Ödemeler' },
  { key: 'cari', label: 'Cari Hesap' },
];

export default function ContractDetailScreen() {
  const { id, tab: tabParam } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'admin' || role === 'super_admin';

  const { data: contract, isLoading } = useContract(id);
  const { data: publicToken } = useContractToken(id);
  const { data: payments = [] } = usePaymentsByContract(id);
  const { data: transactions = [] } = useContractTransactions(id);
  const addTransaction = useAddTransaction(id);
  const deleteTransaction = useDeleteTransaction(id);
  const setMonthlyPaid = useSetMonthlyPaid(id);
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const ensureRecent = useEnsureRecentPayments(id);
  const { data: allClaims = [] } = usePendingClaims();
  const approveClaim = useApproveClaim();
  const rejectClaim = useRejectClaim();
  const claims = useMemo(
    () => allClaims.filter((c) => c.contractId === id),
    [allClaims, id]
  );

  // Backfill recent + upcoming charge months once the contract loads, so past
  // months with no record show up as overdue/pending (never silently paid).
  const ensuredFor = useRef<string | null>(null);
  useEffect(() => {
    if (contract && contract.status === 'active' && ensuredFor.current !== contract.id) {
      ensuredFor.current = contract.id;
      ensureRecent.mutate(contract);
    }
  }, [contract, ensureRecent]);

  const [tab, setTab] = useState<Tab>(tabParam === 'odemeler' ? 'odemeler' : 'genel');
  const [messageOpen, setMessageOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [txToDelete, setTxToDelete] = useState<PaymentTransaction | null>(null);
  const [monthActions, setMonthActions] = useState<Payment | null>(null);
  const [resetTarget, setResetTarget] = useState<Payment | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);

  // Show only the recent window (last 3 + current + next 1), newest first.
  const recentPayments = useMemo(() => {
    const cutoff = recentPeriodCutoff();
    return payments
      .filter((p) => p.periodMonth >= cutoff)
      .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
  }, [payments]);

  // Cari hesap: full ledger (chronological) + derived balance summary.
  const ledgerRows = useMemo(() => generateLedgerRows(payments), [payments]);
  const balance = useMemo(
    () => (contract ? getContractBalance(contract, payments) : null),
    [contract, payments]
  );

  // The most relevant unpaid period drives the reminder message + default month.
  const outstanding = useMemo(
    () => payments.find((p) => derivePaymentStatus(p) === 'overdue' || derivePaymentStatus(p) === 'partial') ?? payments[0],
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

  const openPaymentSheet = (p: Payment | null) => {
    setActivePayment(p);
    setPaymentSheetOpen(true);
  };

  const setStatus = (status: 'active' | 'passive', label: string) => {
    updateContract.mutate(
      { id: contract.id, patch: { status } },
      { onSuccess: () => toast.success(label) }
    );
  };

  const refreshLedger = () => {
    ensureRecent.mutate(contract, {
      onSuccess: () => toast.success('Cari hesap güncellendi'),
      onError: (e) => toast.error(errorMessage(e, 'Güncellenemedi')),
    });
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
        paymentId: input.paymentId,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        description: input.description,
        receiptUrl,
      });
      setPaymentSheetOpen(false);
      setActivePayment(null);
      toast.success('Ödeme kaydedildi');
    } catch (e) {
      console.warn('Ödeme kaydı hatası:', e);
      toast.error(errorMessage(e, 'Ödeme kaydedilemedi'));
    } finally {
      setSavingPayment(false);
    }
  };

  const handleDeleteTransaction = () => {
    if (!txToDelete) return;
    deleteTransaction.mutate(txToDelete.id, {
      onSuccess: () => {
        setTxToDelete(null);
        toast.success('Ödeme silindi');
      },
      onError: (e) => toast.error(errorMessage(e, 'Ödeme silinemedi')),
    });
  };

  // --- Tenant link (kiracı ödeme linki) ---
  const tenantLink = publicToken ? tenantLinkFor(publicToken) : null;

  const copyTenantLink = async () => {
    if (!tenantLink) return;
    await copyText(tenantLink);
    toast.success('Link kopyalandı');
  };

  const sendTenantLink = () => {
    if (!tenantLink) return;
    const msg = `Sayın ${contract.tenantName}, kira ödeme durumunuzu görüntülemek ve ödeme bildirmek için: ${tenantLink}`;
    void openWhatsApp(contract.tenantPhone, msg);
  };

  const handleApproveClaim = (claim: (typeof claims)[number]) => {
    approveClaim.mutate(
      { claim, contract },
      {
        onSuccess: () => toast.success('Ödeme onaylandı ve cari hesaba işlendi'),
        onError: (e) => toast.error(errorMessage(e, 'Onaylanamadı')),
      }
    );
  };

  const handleRejectClaim = (claimId: string) => {
    rejectClaim.mutate(claimId, {
      onSuccess: () => toast.success('Bildirim reddedildi'),
      onError: (e) => toast.error(errorMessage(e, 'Reddedilemedi')),
    });
  };

  const viewClaimReceipt = async (path: string) => {
    try {
      const url = await getDocumentViewUrl(path);
      Linking.openURL(url);
    } catch {
      toast.error('Dekont açılamadı');
    }
  };

  const markMonthPaid = (p: Payment) => {
    setMonthActions(null);
    setMonthlyPaid.mutate(
      { paymentId: p.id, amountPaid: p.amountDue },
      {
        onSuccess: () => toast.success('Ay ödendi olarak işaretlendi'),
        onError: (e) => toast.error(errorMessage(e, 'İşlem başarısız')),
      }
    );
  };

  const confirmResetMonth = () => {
    if (!resetTarget) return;
    setMonthlyPaid.mutate(
      { paymentId: resetTarget.id, amountPaid: 0 },
      {
        onSuccess: () => {
          setResetTarget(null);
          toast.success('Ay "ödenmedi" olarak güncellendi');
        },
        onError: (e) => toast.error(errorMessage(e, 'İşlem başarısız')),
      }
    );
  };

  const monthActionItems: ActionSheetItem[] = monthActions
    ? [
        {
          label: 'Ödeme Ekle',
          icon: Plus,
          onPress: () => {
            const p = monthActions;
            setMonthActions(null);
            openPaymentSheet(p);
          },
        },
        ...(monthActions.amountPaid < monthActions.amountDue
          ? [
              {
                label: 'Ödendi olarak işaretle',
                icon: CheckCircle2,
                onPress: () => markMonthPaid(monthActions),
              },
            ]
          : []),
        ...(monthActions.amountPaid > 0
          ? [
              {
                label: 'Ödemeyi sıfırla (Ödenmedi)',
                icon: Trash2,
                destructive: true,
                onPress: () => {
                  const p = monthActions;
                  setMonthActions(null);
                  setResetTarget(p);
                },
              },
            ]
          : []),
      ]
    : [];

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
          <ArrowLeft size={24} color={fgColor()} />
        </Pressable>
        <View className="flex-row items-center gap-2">
          <ContractBadge status={contract.status} />
          <Pressable
            onPress={() => setActionsOpen(true)}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
          >
            <MoreHorizontal size={22} color={fgColor()} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-2">
          <Text className="text-2xl font-bold text-foreground">
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
              onPress={() => openPaymentSheet(outstanding ?? null)}
            />
          </View>
        </View>

        {/* Contract expiry banner (renewal / rent-increase reminder) */}
        {(() => {
          if (contract.status !== 'active') return null;
          const d = daysUntilEnd(contract);
          if (d === null || d > 60) return null;
          const overdue = d < 0;
          return (
            <View
              className={`mt-4 flex-row items-center gap-3 rounded-2xl p-3 ${
                overdue || d <= 15 ? 'bg-warning-soft' : 'bg-primary-50'
              }`}
            >
              <CalendarX2 size={20} color={palette.warning} />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  Sözleşme {expiryLabel(d)}
                </Text>
                <Text className="text-xs text-muted">
                  Yenileme veya kira artışı için uygun zaman.
                </Text>
              </View>
            </View>
          );
        })()}

        {/* Cari hesap summary card (always visible) */}
        {balance ? (
          <View className="mt-5">
            <ContractBalanceCard balance={balance} />
          </View>
        ) : null}

        {/* Tabs */}
        <View className="mt-5 flex-row rounded-2xl bg-surface p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                className={`flex-1 items-center rounded-xl py-2.5 ${
                  active ? 'bg-primary' : ''
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${active ? 'text-white' : 'text-muted'}`}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* --- GENEL --- */}
        {tab === 'genel' ? (
          <>
            <SectionHeader title="Kiracı" />
            <Card>
              <InfoRow label="Ad Soyad" value={contract.tenantName} />
              <InfoRow label="Telefon" value={contract.tenantPhone} />
              <InfoRow label="TC Kimlik" value={contract.tenantNationalId ?? '—'} last />
            </Card>

            <SectionHeader title="Mülk Sahibi" />
            <Card>
              <InfoRow label="Ad Soyad" value={contract.ownerName} />
              <InfoRow label="Telefon" value={contract.ownerPhone} last />
            </Card>

            <SectionHeader title="Finansal" />
            <Card>
              <InfoRow label="Kira Bedeli" value={formatCurrency(contract.rentAmount)} />
              <InfoRow label="Aidat" value={formatCurrency(contract.duesAmount)} />
              <InfoRow label="Depozito" value={formatCurrency(contract.depositAmount)} last />
            </Card>

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

            <SectionHeader title="Sözleşme Dosyası" />
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <FileText size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
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

            {/* Tenant payment link */}
            <SectionHeader title="Kiracı Ödeme Linki" />
            <Card>
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                  <Link2 size={20} color={palette.primary} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-foreground">
                    Kiracıya özel link
                  </Text>
                  <Text className="text-sm text-muted">
                    {tenantLink
                      ? 'Kiracı giriş yapmadan borcunu görür, ödeme bildirir'
                      : 'Bu özellik canlı modda kullanılabilir'}
                  </Text>
                </View>
              </View>
              {tenantLink ? (
                <>
                  <View className="mt-3 rounded-2xl bg-background px-3 py-2.5">
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {tenantLink}
                    </Text>
                  </View>
                  <View className="mt-3 flex-row gap-2 border-t border-border/60 pt-3">
                    <Pressable
                      onPress={copyTenantLink}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary-50 py-2.5 active:opacity-80"
                    >
                      <Copy size={16} color={palette.primary} />
                      <Text className="text-xs font-semibold text-primary-700">Kopyala</Text>
                    </Pressable>
                    <Pressable
                      onPress={sendTenantLink}
                      className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success-soft py-2.5 active:opacity-80"
                    >
                      <MessageCircle size={16} color={palette.success} />
                      <Text className="text-xs font-semibold text-success">WhatsApp</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </Card>
          </>
        ) : null}

        {/* --- ÖDEMELER --- */}
        {tab === 'odemeler' ? (
          <>
            {claims.length > 0 ? (
              <>
                <SectionHeader title="Onay Bekleyen Ödemeler" />
                <View className="gap-3">
                  {claims.map((claim) => {
                    const busy =
                      (approveClaim.isPending &&
                        approveClaim.variables?.claim.id === claim.id) ||
                      (rejectClaim.isPending && rejectClaim.variables === claim.id);
                    return (
                      <View
                        key={claim.id}
                        className="rounded-2xl border border-warning/40 bg-warning-soft p-4"
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-base font-bold text-foreground">
                            {formatCurrency(claim.amount)}
                          </Text>
                          <Text className="text-xs text-muted">
                            {formatShortDate(claim.createdAt)}
                          </Text>
                        </View>
                        <Text className="mt-0.5 text-sm capitalize text-muted">
                          Kiracı bildirimi • {formatMonth(claim.periodMonth)}
                        </Text>
                        {claim.note ? (
                          <Text className="mt-1 text-sm text-foreground">{claim.note}</Text>
                        ) : null}
                        {claim.receiptUrl ? (
                          <Pressable
                            onPress={() => viewClaimReceipt(claim.receiptUrl!)}
                            className="mt-2 flex-row items-center gap-1.5"
                          >
                            <Eye size={14} color={palette.primary} />
                            <Text className="text-xs font-semibold text-primary-700">
                              Dekontu görüntüle
                            </Text>
                          </Pressable>
                        ) : null}
                        <View className="mt-3 flex-row gap-2">
                          <Pressable
                            onPress={() => handleApproveClaim(claim)}
                            disabled={busy}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-success py-2.5 active:opacity-80"
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text className="text-xs font-semibold text-white">Onayla</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleRejectClaim(claim.id)}
                            disabled={busy}
                            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl bg-surface border border-border py-2.5 active:opacity-80"
                          >
                            <Trash2 size={16} color={palette.danger} />
                            <Text className="text-xs font-semibold text-danger">Reddet</Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            <SectionHeader title="Ödeme Geçmişi" />
            {recentPayments.length === 0 ? (
              <EmptyState icon={FileText} title="Ödeme kaydı yok" />
            ) : (
              <View className="gap-3">
                {recentPayments.map((p) => (
                  <PaymentItem key={p.id} payment={p} onPress={() => setMonthActions(p)} />
                ))}
              </View>
            )}

            {transactions.length > 0 ? (
              <>
                <SectionHeader title="Tahsilatlar" />
                <View className="gap-3">
                  {transactions.map((tx) => (
                    <TransactionItem
                      key={tx.id}
                      tx={tx}
                      onDelete={() => setTxToDelete(tx)}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {/* --- CARI HESAP --- */}
        {tab === 'cari' ? (
          <>
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">Cari Hesap Defteri</Text>
              <Pressable
                onPress={refreshLedger}
                disabled={ensureRecent.isPending}
                className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 active:opacity-80"
              >
                <RefreshCw size={14} color={palette.primary} />
                <Text className="text-xs font-semibold text-primary-700">
                  {ensureRecent.isPending ? 'Yenileniyor…' : 'Yenile'}
                </Text>
              </Pressable>
            </View>

            {ledgerRows.length === 0 ? (
              <View className="mt-3">
                <EmptyState
                  icon={FileText}
                  title="Cari hesap boş"
                  description="Eksik ayları oluşturmak için Yenile'ye dokunun."
                />
              </View>
            ) : (
              <View className="mt-3 gap-3">
                {[...ledgerRows].reverse().map((row) => (
                  <LedgerRowCard
                    key={row.paymentId}
                    row={row}
                    onPress={() => {
                      const p = payments.find((pp) => pp.id === row.paymentId);
                      if (p) setMonthActions(p);
                    }}
                  />
                ))}
              </View>
            )}
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
        visible={paymentSheetOpen}
        payment={activePayment}
        payments={payments}
        isSubmitting={savingPayment}
        onClose={() => {
          setPaymentSheetOpen(false);
          setActivePayment(null);
        }}
        onSubmit={handleAddPayment}
      />

      <ActionSheet
        visible={actionsOpen}
        title="Sözleşme İşlemleri"
        items={actionItems}
        onClose={() => setActionsOpen(false)}
      />
      <ActionSheet
        visible={monthActions !== null}
        title={monthActions ? `${formatMonth(monthActions.periodMonth)} dönemi` : ''}
        items={monthActionItems}
        onClose={() => setMonthActions(null)}
      />
      <ConfirmModal
        visible={resetTarget !== null}
        title="Ödemeyi sıfırla"
        message="Bu ayın ödemesi silinip 'ödenmedi' olarak işaretlenecek (varsa tahsilat kayıtları da silinir). Emin misiniz?"
        confirmLabel="Sıfırla"
        destructive
        loading={setMonthlyPaid.isPending}
        onCancel={() => setResetTarget(null)}
        onConfirm={confirmResetMonth}
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
      <ConfirmModal
        visible={txToDelete !== null}
        title="Ödemeyi sil"
        message="Bu tahsilatı silmek istediğinize emin misiniz? Cari hesap otomatik güncellenecek."
        confirmLabel="Sil"
        destructive
        loading={deleteTransaction.isPending}
        onCancel={() => setTxToDelete(null)}
        onConfirm={handleDeleteTransaction}
      />
    </SafeAreaView>
  );
}
