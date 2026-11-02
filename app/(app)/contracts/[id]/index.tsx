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
  Home,
  Pencil,
  Phone,
  Plus,
  TrendingUp,
  LogOut,
  CalendarPlus,
  Trash2,
  Upload,
  User,
  Wallet,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LedgerBadge, PhaseBadge } from '@/components/ui/StatusBadge';
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
  useApplyRentChange,
  useContract,
  useContracts,
  useContractToken,
  useDeleteContract,
  useExtendContract,
  useTerminateContract,
  useUpdateContract,
} from '@/features/contracts/hooks';
import { ExitSheet, ExtendSheet, RentChangeSheet } from '@/features/contracts/components/LifecycleSheets';
import { findContractConflicts } from '@/features/contracts/duplicates';
import {
  usePaymentsByContract,
  useCollectPayment,
  useUndoCollection,
  newClientRef,
  useContractTransactions,
  useDeleteTransaction,
  usePendingClaims,
  useApproveClaim,
  useRejectClaim,
  useResetMonth,
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
import { useTenantForms } from '@/features/tenant-forms/hooks';
import { STATUS_COLORS, STATUS_LABELS, RESULT_LABELS } from '@/features/tenant-forms/config';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { errorMessage } from '@/lib/utils/error';
import { formatCurrency, formatMonth, formatShortDate, paymentDayLabel } from '@/lib/utils/format';
import { derivePaymentStatus } from '@/lib/utils/payments';
import { recentPeriodCutoff } from '@/lib/utils/paymentPeriods';
import { generateLedgerRows, getContractBalance, periodLabel } from '@/lib/ledger/ledger';
import {
  CONTRACT_PHASE_LABEL,
  contractPhase,
  defaultCollectionMonth,
  isClosedContract,
  overdueDebt,
  remainingOf,
} from '@/lib/ledger/accrual';
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
  const { id, tab: tabParam, action: actionParam } = useLocalSearchParams<{
    id: string;
    tab?: string;
    action?: string;
  }>();
  const router = useRouter();
  const toast = useToast();
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === 'admin' || role === 'super_admin';
  // Cari hesap (bakiye/borç) yalnızca yöneticide; personel sade görünüm alır.
  const canSeeLedger = role === 'admin' || role === 'super_admin';

  const { data: contract, isLoading } = useContract(id);
  const { data: allContracts = [] } = useContracts();
  const { data: publicToken } = useContractToken(id);
  const { data: allForms = [] } = useTenantForms();
  const contractForms = allForms.filter((f) => f.contractId === id);
  const entitlement = useEntitlement();
  const { data: payments = [] } = usePaymentsByContract(id);
  const { data: transactions = [] } = useContractTransactions(id);
  const collectPayment = useCollectPayment();
  const undoCollection = useUndoCollection();
  const deleteTransaction = useDeleteTransaction(id);
  const resetMonth = useResetMonth(id);
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const extendContract = useExtendContract();
  const applyRentChange = useApplyRentChange();
  const terminateContract = useTerminateContract();
  // Ödeme penceresi her açıldığında yeni tekrar-koruma anahtarı.
  const clientRef = useRef<string>(newClientRef());
  const { data: allClaims = [] } = usePendingClaims();
  const approveClaim = useApproveClaim();
  const rejectClaim = useRejectClaim();
  const claims = useMemo(
    () => allClaims.filter((c) => c.contractId === id),
    [allClaims, id]
  );

  // NOT: Ekranı açmak veritabanına YAZMAZ. Eksik beklenen aylar repository
  // katmanında sanal olarak hesaplanır; bakiye her ekranda aynıdır.

  const [tab, setTab] = useState<Tab>(tabParam === 'odemeler' ? 'odemeler' : 'genel');
  // Personel yalnızca "Genel"i görür (Ödemeler + Cari Hesap yönetici için).
  const visibleTabs = canSeeLedger ? TABS : TABS.filter((t) => t.key === 'genel');
  const activeTab: Tab = canSeeLedger ? tab : 'genel';
  const [messageOpen, setMessageOpen] = useState(false);
  const [activePayment, setActivePayment] = useState<Payment | null>(null);
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [txToDelete, setTxToDelete] = useState<PaymentTransaction | null>(null);
  const [monthActions, setMonthActions] = useState<Payment | null>(null);
  const [resetTarget, setResetTarget] = useState<Payment | null>(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [lifecycle, setLifecycle] = useState<'extend' | 'rent' | 'exit' | null>(null);
  // Ana sayfadaki "Uzat" / "Kiracı Çıkışı" kısayolları doğrudan pencereyi açar.
  useEffect(() => {
    if (actionParam === 'extend') setLifecycle('extend');
    else if (actionParam === 'exit') setLifecycle('exit');
  }, [actionParam]);

  // "Ödeme Geçmişi": geçmiş + içinde bulunulan ay (gelecek aylar hariç), yeni→eski.
  const recentPayments = useMemo(() => {
    const cutoff = recentPeriodCutoff();
    const currentKey = new Date().toISOString().slice(0, 7);
    return payments
      .filter((p) => p.periodMonth >= cutoff && p.periodMonth.slice(0, 7) <= currentKey)
      .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth));
  }, [payments]);

  // Sözleşme geneli tahsilat performansı (yıllık hero için) — gerçek toplamlar.
  const perf = useMemo(() => {
    let collected = 0;
    let expected = 0;
    for (const p of payments) {
      expected += p.amountDue;
      collected += p.amountPaid;
    }
    return { collected, expected };
  }, [payments]);

  // Aynı daireye başka aktif sözleşme(ler) — çakışma uyarısı için.
  const unitConflicts = useMemo(
    () =>
      contract
        ? findContractConflicts(allContracts, contract, contract.id).sameUnit
        : [],
    [allContracts, contract]
  );

  // Cari hesap: full ledger (chronological) + derived balance summary.
  const ledgerRows = useMemo(() => generateLedgerRows(payments), [payments]);
  const balance = useMemo(
    () => (contract ? getContractBalance(contract, payments) : null),
    [contract, payments]
  );

  // Varsayılan tahsilat ayı: TÜM ekranlarla aynı kural (en eski açık ay).
  const outstanding = useMemo(() => defaultCollectionMonth(payments) ?? undefined, [payments]);
  const debt = useMemo(() => overdueDebt(payments), [payments]);

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
    clientRef.current = newClientRef();
    setActivePayment(p);
    setPaymentSheetOpen(true);
  };
  const phase = contractPhase(contract);
  const closed = isClosedContract(contract);

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
      const target = payments.find((p) => p.id === input.paymentId);
      const { transactionId } = await collectPayment.mutateAsync({
        contractId: contract.id,
        paymentId: input.paymentId,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        description: input.description,
        receiptUrl,
        clientRef: clientRef.current,
      });
      setPaymentSheetOpen(false);
      setActivePayment(null);
      toast.success(
        `${target ? periodLabel(target) : 'Ödeme'} · ${formatCurrency(input.amount)} kaydedildi`,
        { action: { label: 'Geri al', onPress: () => undo(transactionId) } }
      );
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
  // Tenant portal is a Pro/Business feature.
  const tenantLink =
    publicToken && entitlement.limits.tenantPortal ? tenantLinkFor(publicToken) : null;

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

  const undo = (transactionId: string) =>
    undoCollection.mutate(
      { transactionId, contractId: contract.id },
      {
        onSuccess: () => toast.info('Tahsilat geri alındı'),
        onError: (e) => toast.error(errorMessage(e, 'Geri alınamadı')),
      }
    );

  // "Ödendi olarak işaretle": kalan tutar KADAR tahsilat eklenir; mevcut
  // tahsilatlar/dekontlar silinmez (eski sürüm siliyordu).
  const markMonthPaid = (p: Payment) => {
    setMonthActions(null);
    const amount = remainingOf(p);
    if (amount <= 0) return;
    collectPayment.mutate(
      {
        contractId: contract.id,
        paymentId: p.id,
        amount,
        paidAt: new Date().toISOString().slice(0, 10),
        method: null,
        description: 'Ödendi olarak işaretlendi',
        receiptUrl: null,
        clientRef: newClientRef(),
      },
      {
        onSuccess: ({ transactionId }) =>
          toast.success(`${periodLabel(p)} · ${formatCurrency(amount)} kaydedildi`, {
            action: { label: 'Geri al', onPress: () => undo(transactionId) },
          }),
        onError: (e) => toast.error(errorMessage(e, 'İşlem başarısız')),
      }
    );
  };

  const confirmResetMonth = () => {
    if (!resetTarget) return;
    resetMonth.mutate(
      resetTarget.id,
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
        ...(canSeeLedger && monthActions.amountPaid > 0
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
    ...(!closed
      ? [
          { label: 'Sözleşmeyi Uzat', icon: CalendarPlus, onPress: () => setLifecycle('extend') },
          { label: 'Kira Artışı', icon: TrendingUp, onPress: () => setLifecycle('rent') },
          { label: 'Kiracı Çıkışı', icon: LogOut, onPress: () => setLifecycle('exit') },
        ]
      : []),
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
      {/* Header — geri + başlık + işlemler (Stitch) */}
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <ArrowLeft size={22} color={fgColor()} />
        </Pressable>
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted">
          Sözleşme Detayı
        </Text>
        <Pressable
          onPress={() => setActionsOpen(true)}
          className="h-10 w-10 items-center justify-center rounded-full bg-surface"
        >
          <MoreHorizontal size={22} color={fgColor()} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* Kiracı hero kartı (Stitch) — avatar + isim + durum + konum + TC + tarih */}
        <View className="mt-3 rounded-[26px] border border-border/60 bg-surface p-4 shadow-sm shadow-black/5">
          <View className="flex-row items-center gap-3">
            <Avatar name={contract.tenantName} size={52} />
            <View className="flex-1">
              <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
                {contract.tenantName}
              </Text>
              <Text className="mt-0.5 text-sm text-muted" numberOfLines={1}>
                {contract.propertyName}
                {location ? ` · ${location}` : ''}
              </Text>
              <View className="mt-1.5 flex-row">
                <PhaseBadge contract={contract} />
              </View>
            </View>
          </View>
          <View className="mt-3 flex-row flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/60 pt-3">
            {contract.tenantNationalId ? (
              <Text className="text-xs text-muted">TC: {contract.tenantNationalId}</Text>
            ) : null}
            {contract.tenantNationalId ? <Text className="text-xs text-muted">·</Text> : null}
            <Text className="text-xs text-muted">
              {formatShortDate(contract.startDate)}
              {contract.endDate ? ` – ${formatShortDate(contract.endDate)}` : ''}
            </Text>
          </View>
        </View>

        {/* Çakışma uyarısı — aynı daireye başka aktif sözleşme */}
        {unitConflicts.length > 0 ? (
          <View className="mt-4 rounded-2xl border border-danger/40 bg-danger-soft p-4">
            <View className="flex-row items-center gap-2">
              <CalendarX2 size={16} color={palette.danger} />
              <Text className="flex-1 text-sm font-bold text-danger">
                Bu daireye başka aktif sözleşme var
              </Text>
            </View>
            <Text className="mt-1 text-xs text-muted">
              Aynı mülk/blok/dairede birden fazla aktif sözleşme çakışmadır. Doğru olmayanı
              pasife alın veya silin.
            </Text>
            <View className="mt-2 gap-2">
              {unitConflicts.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => router.push(`/(app)/contracts/${c.id}`)}
                  className="flex-row items-center justify-between rounded-xl bg-surface px-3 py-2.5 active:opacity-80"
                >
                  <Text className="flex-1 pr-2 text-sm font-semibold text-foreground" numberOfLines={1}>
                    {c.tenantName}
                  </Text>
                  <Text className="text-xs font-semibold text-primary-700">Görüntüle</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

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
          {canSeeLedger && (!closed || debt.total > 0) ? (
            <View className="flex-1">
              <Button
                label="Ödeme"
                icon={Plus}
                size="md"
                onPress={() => openPaymentSheet(outstanding ?? null)}
              />
            </View>
          ) : null}
        </View>

        {/* Personel: bu ayın durumu (Gecikmiş / Bekliyor / Ödendi) */}
        {balance && !canSeeLedger ? (
          <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm font-semibold text-foreground">Bu ay</Text>
            <LedgerBadge status={balance.currentMonth.status} />
          </View>
        ) : null}

        {/* Süre dolumu / yaklaşan bitiş: durum açıkça + Uzat / Çıkış */}
        {(() => {
          if (closed) return null;
          const d = daysUntilEnd(contract);
          if (d === null || d > 60) return null;
          const expired = d < 0;
          return (
            <View
              className={`mt-4 rounded-2xl p-3 ${
                phase === 'expired_stopped' ? 'bg-danger-soft' : expired || d <= 15 ? 'bg-warning-soft' : 'bg-primary-50'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <CalendarX2 size={20} color={phase === 'expired_stopped' ? palette.danger : palette.warning} />
                <View className="flex-1">
                  <Text className={`text-sm font-semibold ${expired || d <= 15 ? 'text-foreground' : 'text-primary-800'}`}>
                    Sözleşme {expiryLabel(d)}
                  </Text>
                  <Text className={`text-xs ${expired || d <= 15 ? 'text-muted' : 'text-primary-700'}`}>
                    {phase === 'expired_renewing'
                      ? 'Uzatıldı mı, kiracı çıktı mı? Karar verene kadar kira takibi aynı koşullarla sürüyor.'
                      : phase === 'expired_stopped'
                        ? 'Kira takibi bitiş ayında durdu. Kiracı devam ediyorsa uzatın; çıktıysa çıkışı kaydedin.'
                        : contract.autoRenew === false
                          ? 'Bitişte takip duracak. Uzatma veya kira artışı için uygun zaman.'
                          : 'Bitişte aynı koşullarla uzayacak. Kira artışı için uygun zaman.'}
                  </Text>
                </View>
              </View>
              {canSeeLedger ? (
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    onPress={() => setLifecycle('extend')}
                    className="flex-1 items-center rounded-2xl bg-surface py-2.5 active:opacity-80"
                  >
                    <Text className="text-sm font-semibold text-primary-700">Uzat</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLifecycle('rent')}
                    className="flex-1 items-center rounded-2xl bg-surface py-2.5 active:opacity-80"
                  >
                    <Text className="text-sm font-semibold text-primary-700">Kira Artışı</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setLifecycle('exit')}
                    className="flex-1 items-center rounded-2xl bg-surface py-2.5 active:opacity-80"
                  >
                    <Text className="text-sm font-semibold text-foreground">Çıkış</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })()}

        {/* Sonlandırılmış: çıkış + depozito özeti; geçmiş borç tahsil edilebilir */}
        {contract.status === 'terminated' ? (
          <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-sm font-bold text-foreground">
              {CONTRACT_PHASE_LABEL.terminated}
              {contract.terminatedAt ? ` · çıkış ${formatShortDate(contract.terminatedAt)}` : ''}
            </Text>
            <Text className="mt-1 text-xs text-muted">
              Yeni kira borcu oluşmaz.
              {debt.total > 0 ? ` Kalan borç ${formatCurrency(debt.total)} tahsil edilebilir.` : ' Açık borç yok.'}
            </Text>
            {contract.depositReturned != null || contract.depositDeduction != null ? (
              <Text className="mt-1 text-xs text-foreground">
                Depozito: {formatCurrency(contract.depositReturned ?? 0)} iade ·{' '}
                {formatCurrency(contract.depositDeduction ?? 0)} kesinti
                {contract.depositNote ? ` (${contract.depositNote})` : ''}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Planlı (ileri tarihli) kira artışı */}
        {contract.nextRentFrom && !closed ? (
          <View className="mt-4 rounded-2xl bg-primary-50 p-3">
            <Text className="text-xs font-semibold text-primary-800">
              {formatMonth(contract.nextRentFrom)} itibarıyla kira{' '}
              {formatCurrency((contract.nextRentAmount ?? contract.rentAmount) + (contract.nextDuesAmount ?? contract.duesAmount))}{' '}
              olacak.
            </Text>
          </View>
        ) : null}

        {/* Cari hesap özeti — yalnızca yönetici */}
        {balance && canSeeLedger ? (
          <View className="mt-5">
            <ContractBalanceCard
              balance={balance}
              deposit={contract.depositAmount}
              paymentDay={contract.paymentDay}
              collected={perf.collected}
              expected={perf.expected}
              onRecord={() => openPaymentSheet(outstanding ?? null)}
              onStatement={() => setTab('cari')}
            />
          </View>
        ) : null}

        {/* Tabs — Stitch segmented control (açık track, beyaz aktif segment) */}
        {visibleTabs.length > 1 ? (
          <View className="mt-5 flex-row rounded-full bg-background p-1">
            {visibleTabs.map((t) => {
              const active = activeTab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  className={`flex-1 items-center rounded-full py-2.5 ${
                    active ? 'bg-surface shadow-sm shadow-black/5' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${active ? 'text-primary-700' : 'text-muted'}`}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* --- GENEL --- */}
        {activeTab === 'genel' ? (
          <>
            <SectionHeader title="Kiracı" icon={User} />
            <Card>
              <InfoRow label="Ad Soyad" value={contract.tenantName} />
              <InfoRow label="Telefon" value={contract.tenantPhone} />
              <InfoRow label="TC Kimlik" value={contract.tenantNationalId ?? '—'} last />
            </Card>

            <SectionHeader title="Mülk Sahibi" icon={Home} />
            <Card>
              <InfoRow label="Ad Soyad" value={contract.ownerName} />
              <InfoRow label="Telefon" value={contract.ownerPhone} last />
            </Card>

            <SectionHeader title="Finansal" icon={Wallet} />
            <Card>
              <InfoRow label="Kira Bedeli" value={formatCurrency(contract.rentAmount)} />
              <InfoRow label="Aidat" value={formatCurrency(contract.duesAmount)} />
              <InfoRow label="Depozito" value={formatCurrency(contract.depositAmount)} />
              <InfoRow
                label="Komisyon"
                value={formatCurrency(contract.commissionAmount ?? 0)}
                last
              />
            </Card>

            <SectionHeader title="Sözleşme" icon={FileText} />
            <Card>
              <InfoRow label="Başlangıç" value={formatShortDate(contract.startDate)} />
              <InfoRow
                label="Bitiş"
                value={contract.endDate ? formatShortDate(contract.endDate) : '—'}
              />
              <InfoRow label="Ödeme Günü" value={paymentDayLabel(contract.paymentDay)} />
              <InfoRow label="Notlar" value={contract.notes ?? '—'} last />
            </Card>

            <SectionHeader title="Sözleşme Dosyası" icon={Upload} />
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
                      : !entitlement.limits.tenantPortal
                        ? 'Pro ve Business planlarına dahildir'
                        : 'Bu özellik canlı modda kullanılabilir'}
                  </Text>
                </View>
                {!entitlement.limits.tenantPortal ? (
                  <View className="rounded-full bg-primary-50 px-3 py-1">
                    <Text className="text-xs font-semibold text-primary-700">Pro</Text>
                  </View>
                ) : null}
              </View>
              {!entitlement.limits.tenantPortal ? (
                <Pressable
                  onPress={() => router.push('/(app)/paywall')}
                  className="mt-3 items-center rounded-2xl bg-primary py-2.5 active:opacity-80"
                >
                  <Text className="text-sm font-semibold text-white">Planları Gör</Text>
                </Pressable>
              ) : tenantLink ? (
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

            {/* Kiracı Bilgi Formu */}
            <SectionHeader
              title="Kiracı Bilgi Formu"
              action={
                <Pressable onPress={() => router.push('/(app)/tenant-forms/new')}>
                  <Text className="text-sm font-semibold text-primary-700">+ Yeni Form</Text>
                </Pressable>
              }
            />
            {contractForms.length === 0 ? (
              <Card onPress={() => router.push('/(app)/tenant-forms/new')}>
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
                    <FileText size={20} color={palette.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      Bilgi formu gönder
                    </Text>
                    <Text className="text-sm text-muted">
                      Kiracıya doldurması için güvenli form linki oluştur
                    </Text>
                  </View>
                </View>
              </Card>
            ) : (
              <View className="gap-2">
                {contractForms.map((f) => {
                  const sc = STATUS_COLORS[f.status];
                  return (
                    <Card key={f.id} onPress={() => router.push(`/(app)/tenant-forms/${f.id}`)}>
                      <View className="flex-row items-center justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
                            {f.tenantName || 'Kiracı formu'}
                          </Text>
                          <Text className="mt-0.5 text-sm text-muted">
                            {f.reviewResult && f.reviewResult !== 'unrated'
                              ? RESULT_LABELS[f.reviewResult]
                              : STATUS_LABELS[f.status]}
                          </Text>
                        </View>
                        <View className={`rounded-full px-3 py-1 ${sc.bg}`}>
                          <Text className={`text-xs font-semibold ${sc.text}`}>
                            {STATUS_LABELS[f.status]}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </>
        ) : null}

        {/* --- ÖDEMELER --- */}
        {activeTab === 'odemeler' ? (
          <>
            {canSeeLedger && claims.length > 0 ? (
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
                      onDelete={canSeeLedger ? () => setTxToDelete(tx) : undefined}
                    />
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {/* --- CARI HESAP --- */}
        {activeTab === 'cari' ? (
          <>
            <View className="mt-5">
              <Text className="text-base font-bold text-foreground">Cari Hesap Defteri</Text>
              <Text className="mt-0.5 text-xs text-muted">
                Takip başlangıcı:{' '}
                {formatMonth(contract.trackingStart ?? contract.startDate)} · öncesi için otomatik
                borç yazılmaz.
              </Text>
            </View>

            {ledgerRows.length === 0 ? (
              <View className="mt-3">
                <EmptyState
                  icon={FileText}
                  title="Cari hesap boş"
                  description="Takip başlangıcından itibaren aylar burada görünür."
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

      <ExtendSheet
        contract={contract}
        visible={lifecycle === 'extend'}
        submitting={extendContract.isPending}
        onClose={() => setLifecycle(null)}
        onSubmit={(v) =>
          extendContract.mutate(
            { id: contract.id, endDate: v.endDate, autoRenew: v.autoRenew, rentChange: v.rentChange },
            {
              onSuccess: () => {
                setLifecycle(null);
                toast.success(
                  v.endDate ? `Sözleşme ${formatShortDate(v.endDate)} tarihine uzatıldı` : 'Sözleşme uzatıldı'
                );
              },
              onError: (e) => toast.error(errorMessage(e, 'Uzatılamadı')),
            }
          )
        }
      />
      <RentChangeSheet
        contract={contract}
        visible={lifecycle === 'rent'}
        submitting={applyRentChange.isPending}
        onClose={() => setLifecycle(null)}
        onSubmit={(input) =>
          applyRentChange.mutate(
            { id: contract.id, input },
            {
              onSuccess: () => {
                setLifecycle(null);
                toast.success(
                  `${formatMonth(input.effectiveMonth)} itibarıyla ${formatCurrency(input.rentAmount + input.duesAmount)}`
                );
              },
              onError: (e) => toast.error(errorMessage(e, 'Kira artışı kaydedilemedi')),
            }
          )
        }
      />
      <ExitSheet
        contract={contract}
        visible={lifecycle === 'exit'}
        openDebt={debt.total}
        submitting={terminateContract.isPending}
        onClose={() => setLifecycle(null)}
        onSubmit={({ input, markUnitVacant }) =>
          terminateContract.mutate(
            { contract, input, markUnitVacant },
            {
              onSuccess: () => {
                setLifecycle(null);
                toast.success('Kiracı çıkışı kaydedildi');
              },
              onError: (e) => toast.error(errorMessage(e, 'Çıkış kaydedilemedi')),
            }
          )
        }
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
        loading={resetMonth.isPending}
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
