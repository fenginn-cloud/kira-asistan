import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { formatCurrency } from '@/lib/utils/format';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { periodLabel } from '@/lib/ledger/ledger';
import { collectibleMonths, remainingOf } from '@/lib/ledger/accrual';
import type { Contract, Payment } from '@/types';

export interface CollectSubmit {
  payment: Payment;
  amount: number;
  note: string | null;
}

interface Props {
  contract: Contract | null;
  /** Sözleşmenin (beklenen aylar dahil) ödemeleri. */
  payments: Payment[];
  /** Kartta gösterilen ay (varsa önce o seçilir), yoksa en eski açık ay. */
  preferredPaymentId?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (input: CollectSubmit) => void;
}

/**
 * Hızlı tahsilat ("Alındı" / "Tahsilat Gir"). Kapatılacak ay ve tutar AÇIKÇA
 * gösterilir; ne görülüyorsa o kaydedilir. Varsayılan: en eski açık ay ve o ayın
 * KALAN borcu. Kısmi ödeme için tutar değiştirilebilir.
 */
export function CollectSheet({
  contract,
  payments,
  preferredPaymentId,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const months = useMemo(() => collectibleMonths(payments), [payments]);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contract) return;
    const initial =
      months.find((m) => m.id === preferredPaymentId) ?? months[0] ?? null;
    setPaymentId(initial?.id ?? null);
    setAmount(initial ? remainingOf(initial) : 0);
    setNote('');
    setError(null);
  }, [contract?.id, preferredPaymentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = months.find((m) => m.id === paymentId) ?? null;
  const remaining = selected ? remainingOf(selected) : 0;
  const totalOpen = months.reduce((s, m) => s + remainingOf(m), 0);
  const loc = contract
    ? [contract.propertyName, contract.block, contract.unit].filter(Boolean).join(' ')
    : '';

  const pick = (p: Payment) => {
    setPaymentId(p.id);
    setAmount(remainingOf(p));
    setError(null);
  };

  const submit = () => {
    if (!selected) return;
    if (!(amount > 0)) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    onConfirm({ payment: selected, amount, note: note.trim() || null });
  };

  const partial = selected && amount > 0 && amount < remaining;
  const over = selected && amount > remaining;

  return (
    <Modal visible={contract !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/40"
      >
        <View
          className="max-h-[90%] rounded-t-[28px] bg-surface p-5"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="mb-3 items-center">
            <View className="h-1.5 w-10 rounded-full bg-border" />
          </View>

          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-9 w-9 items-center justify-center rounded-2xl bg-success-soft">
                <CheckCircle2 size={18} color={palette.success} />
              </View>
              <Text className="text-lg font-bold text-foreground">Tahsilat Gir</Text>
            </View>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {contract ? (
              <Text className="mb-3 text-sm font-semibold text-foreground" numberOfLines={1}>
                {loc} • {contract.tenantName}
              </Text>
            ) : null}

            {months.length === 0 ? (
              <View className="rounded-2xl bg-background p-4">
                <Text className="text-sm text-muted">Açık borç yok. Tüm aylar ödenmiş.</Text>
              </View>
            ) : (
              <>
                <Text className="mb-1.5 text-sm font-medium text-muted">
                  Hangi ay kapatılsın?
                  {months.length > 1 ? ` · ${months.length} açık ay, toplam ${formatCurrency(totalOpen)}` : ''}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {months.map((m, i) => {
                    const active = m.id === paymentId;
                    return (
                      <Pressable
                        key={m.id}
                        onPress={() => pick(m)}
                        accessibilityState={{ selected: active }}
                        className={`rounded-2xl px-4 py-2.5 ${active ? 'bg-primary' : 'bg-background'}`}
                      >
                        <Text
                          className={`text-sm font-semibold capitalize ${active ? 'text-white' : 'text-foreground'}`}
                        >
                          {periodLabel(m)}
                          {i === 0 && months.length > 1 ? ' (en eski)' : ''}
                        </Text>
                        <Text className={`text-xs ${active ? 'text-white/80' : 'text-muted'}`}>
                          Kalan {formatCurrency(remainingOf(m))}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <View className="mt-4">
                  <MoneyInput label="Alınan tutar" value={amount} onChangeNumber={setAmount} />
                </View>

                {/* Ne kaydedilecekse BİREBİR o yazılır. */}
                {selected ? (
                  <View className="mt-3 rounded-2xl bg-background p-3">
                    <Text className="text-sm text-foreground">
                      <Text className="font-bold capitalize">{periodLabel(selected)}</Text>
                      {' için '}
                      <Text className="font-bold">{formatCurrency(amount || 0)}</Text>
                      {' kaydedilecek.'}
                    </Text>
                    <Text className={`mt-0.5 text-xs ${partial ? 'text-warning' : 'text-muted'}`}>
                      {partial
                        ? `Kısmi ödeme — bu ayda ${formatCurrency(remaining - amount)} kalacak.`
                        : over
                          ? `Kalan borçtan ${formatCurrency(amount - remaining)} fazla — alacak olarak işlenir.`
                          : 'Bu ay tamamen kapanacak.'}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-3 gap-1.5">
                  <Text className="text-sm font-medium text-muted">Not (opsiyonel)</Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder="Örn. elden alındı, havale vb."
                    placeholderTextColor={colors.textMuted}
                    className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
                  />
                </View>

                {error ? <Text className="mt-2 text-xs text-danger">{error}</Text> : null}

                <View className="mt-4">
                  <Button
                    label="Tahsilatı Kaydet"
                    icon={CheckCircle2}
                    loading={submitting}
                    disabled={submitting || !selected}
                    onPress={submit}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
