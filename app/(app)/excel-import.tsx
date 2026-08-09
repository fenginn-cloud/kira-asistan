import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Sparkles,
  Upload,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useContracts } from '@/features/contracts/hooks';
import { useAuthStore } from '@/store/authStore';
import { useEntitlement } from '@/features/subscription/useEntitlement';
import { queryKeys } from '@/lib/query';
import { formatCurrency } from '@/lib/utils/format';
import { palette } from '@/lib/theme/colors';
import { analyzeWorkbook, type ImportPlan } from '@/features/excel-sync';
import { pickWorkbook } from '@/features/excel-sync/readWorkbook';
import { applyPlan, type ApplyResult } from '@/features/excel-sync/apply';

type Stage = 'idle' | 'analyzing' | 'preview' | 'applying' | 'done';

const fmtVal = (field: string, v: unknown): string => {
  if (v == null || v === '') return '—';
  if (field === 'rentAmount' || field === 'depositAmount') return formatCurrency(Number(v));
  return String(v);
};

export default function ExcelImportScreen() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: contracts = [] } = useContracts();
  const entitlement = useEntitlement();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [stage, setStage] = useState<Stage>('idle');
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<ApplyResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-1 items-center justify-center p-6">
          <EmptyState icon={AlertTriangle} title="Yetkiniz yok" description="Excel aktarımı yalnızca yöneticiler içindir." />
        </View>
      </SafeAreaView>
    );
  }

  const onPick = async () => {
    setStage('analyzing');
    try {
      const picked = await pickWorkbook();
      if (!picked) { setStage('idle'); return; }
      const p = analyzeWorkbook(picked.workbook, contracts, { year: new Date().getFullYear() });
      setPlan(p);
      setFileName(picked.fileName);
      setShowDetails(false);
      setStage('preview');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Excel okunamadı');
      setStage('idle');
    }
  };

  const onApply = async () => {
    if (!plan || !user) return;
    setStage('applying');
    const ref = contracts[0];
    try {
      const r = await applyPlan(plan, {
        companyId: user.companyId,
        assignedUserId: user.id,
        ownerName: ref?.ownerName ?? user.fullName,
        ownerPhone: ref?.ownerPhone ?? '00000',
        uploadedBy: user.id,
        fileName,
      });
      setResult(r);
      await Promise.all([
        qc.refetchQueries({ queryKey: queryKeys.contracts }),
        qc.refetchQueries({ queryKey: queryKeys.paymentsAll }),
      ]);
      setStage('done');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Güncelleme başarısız');
      setStage('preview');
    }
  };

  const reset = () => { setPlan(null); setResult(null); setFileName(''); setStage('idle'); };

  const updates = plan?.rows.filter((r) => r.kind === 'update') ?? [];
  const reviews = plan?.rows.filter((r) => r.kind === 'review') ?? [];

  // Excel import is a Pro/Business feature — redirect Free users to the paywall.
  if (!entitlement.limits.excel) {
    return <Redirect href="/(app)/paywall" />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-surface">
            <ArrowLeft size={20} color={palette.muted} />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Excel Aktarımı</Text>
        </View>

        {/* IDLE / ANALYZING — upload area */}
        {(stage === 'idle' || stage === 'analyzing') && (
          <>
            <Text className="mt-3 text-sm text-muted">
              Güncel Excel dosyanızı yükleyin. Sistem sözleşmeleri okur, mevcutlarla karşılaştırır ve
              yalnızca değişenleri günceller. Hiçbir kayıt silinmez, ödeme geçmişi korunur.
            </Text>
            <Pressable
              onPress={stage === 'analyzing' ? undefined : onPick}
              className="mt-5 items-center justify-center rounded-3xl border-2 border-dashed border-border bg-surface px-6 py-12 active:opacity-80"
            >
              {stage === 'analyzing' ? (
                <>
                  <ActivityIndicator color={palette.primary} />
                  <Text className="mt-3 text-base font-semibold text-foreground">Analiz ediliyor…</Text>
                </>
              ) : (
                <>
                  <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary-50">
                    <Upload size={28} color={palette.primary} />
                  </View>
                  <Text className="mt-4 text-base font-semibold text-foreground">Excel dosyası seç</Text>
                  <Text className="mt-1 text-xs text-muted">.xlsx veya .xls</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {/* PREVIEW — analysis result */}
        {stage === 'preview' && plan && (
          <>
            <View className="mt-4 flex-row items-center gap-2 rounded-2xl bg-surface p-3">
              <FileSpreadsheet size={18} color={palette.primary} />
              <Text className="flex-1 text-sm font-medium text-foreground" numberOfLines={1}>{fileName}</Text>
            </View>

            <SectionHeader title="Analiz Sonucu" />
            <View className="gap-3">
              <View className="flex-row gap-3">
                <StatCard label="Yeni sözleşme" value={`${plan.summary.new}`} icon={Sparkles} tone="primary" />
                <StatCard label="Güncellenecek" value={`${plan.summary.update}`} icon={CheckCircle2} tone="success" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Değişmeyen" value={`${plan.summary.unchanged}`} icon={CheckCircle2} tone="primary" />
                <StatCard label="İncelenecek" value={`${plan.summary.review}`} icon={AlertTriangle} tone={plan.summary.review ? "warning" : "primary"} />
              </View>
            </View>

            {/* Change details */}
            {updates.length > 0 && (
              <>
                <Pressable onPress={() => setShowDetails((s) => !s)} className="mt-5 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-foreground">Değişiklik Detayı ({updates.length})</Text>
                  {showDetails ? <ChevronUp size={20} color={palette.muted} /> : <ChevronDown size={20} color={palette.muted} />}
                </Pressable>
                {showDetails && (
                  <View className="mt-2 gap-2">
                    {updates.map((row, i) => (
                      <Card key={i} className="gap-1">
                        <Text className="text-sm font-bold text-foreground">
                          {[row.extracted.propertyName, row.extracted.block, row.extracted.unit].filter(Boolean).join(' ')} • {row.extracted.tenantName}
                        </Text>
                        {(row.changes ?? []).map((c) => (
                          <Text key={c.field} className="text-xs text-muted">
                            {c.label}: <Text className="text-danger">{fmtVal(c.field, c.from)}</Text> → <Text className="text-success">{fmtVal(c.field, c.to)}</Text>
                          </Text>
                        ))}
                      </Card>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* Review list */}
            {reviews.length > 0 && (
              <>
                <SectionHeader title={`İncelenmesi Gerekenler (${reviews.length})`} />
                <View className="gap-2">
                  {reviews.map((row, i) => (
                    <View key={i} className="rounded-2xl border border-warning/40 bg-warning-soft p-3">
                      <Text className="text-sm font-semibold text-foreground">
                        {row.extracted.source.sheet} #{row.extracted.source.row} • {row.extracted.tenantName ?? '—'}
                      </Text>
                      <Text className="text-xs text-muted">{row.reviewDetail}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {plan.notInExcel.length > 0 && (
              <Text className="mt-4 text-xs text-muted">
                Not: Excel'de bulunmayan {plan.notInExcel.length} sözleşme sistemde korunuyor (silinmez).
              </Text>
            )}

            <View className="mt-6 gap-2">
              <Button
                label={plan.summary.new + plan.summary.update > 0 ? `Güncellemeyi Uygula (${plan.summary.new + plan.summary.update})` : 'Değişiklik yok'}
                icon={CheckCircle2}
                onPress={onApply}
                disabled={plan.summary.new + plan.summary.update === 0}
              />
              <Pressable onPress={reset} className="items-center py-3">
                <Text className="text-sm font-semibold text-muted">Vazgeç / Başka dosya</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* APPLYING */}
        {stage === 'applying' && (
          <View className="mt-24 items-center">
            <ActivityIndicator color={palette.primary} size="large" />
            <Text className="mt-4 text-base font-semibold text-foreground">Güncelleniyor…</Text>
          </View>
        )}

        {/* DONE */}
        {stage === 'done' && result && (
          <>
            <View className="mt-8 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success-soft">
                <CheckCircle2 size={32} color={palette.success} />
              </View>
              <Text className="mt-4 text-xl font-bold text-foreground">Tamamlandı</Text>
            </View>
            <View className="mt-6 gap-3">
              <View className="flex-row gap-3">
                <StatCard label="Yeni eklenen" value={`${result.created}`} icon={Sparkles} tone="primary" />
                <StatCard label="Güncellenen" value={`${result.updated}`} icon={CheckCircle2} tone="success" />
              </View>
              <View className="flex-row gap-3">
                <StatCard label="Ödendi işaretlenen ay" value={`${result.monthsSettled}`} icon={CheckCircle2} tone="primary" />
                <StatCard label="Hata" value={`${result.errors.length}`} icon={AlertTriangle} tone={result.errors.length ? "danger" : "primary"} />
              </View>
            </View>
            {result.errors.length > 0 && (
              <View className="mt-4 gap-2">
                {result.errors.slice(0, 10).map((e, i) => (
                  <Text key={i} className="text-xs text-danger">{e.label}: {e.error}</Text>
                ))}
              </View>
            )}
            <View className="mt-6">
              <Button label="Bitti" onPress={reset} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
