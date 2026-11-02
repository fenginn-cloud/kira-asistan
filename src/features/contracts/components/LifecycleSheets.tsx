import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { addMonths, addYears, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Button } from '@/components/ui/Button';
import { DateField } from '@/components/ui/DateField';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { palette } from '@/lib/theme/colors';
import { formatCurrency, formatMonth } from '@/lib/utils/format';
import { monthStart, trackingStartMonth } from '@/lib/ledger/accrual';
import type { RentChangeInput, TerminateInput } from '@/services/repositories/types';
import type { Contract } from '@/types';
import { MonthChips } from './ContractForm';

function Sheet({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
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
            <Text className="text-lg font-bold text-foreground">{title}</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const fmt = (iso: string) => format(parseISO(iso), 'MMM yyyy', { locale: tr });

/** `from` ayından itibaren `count` ay seçenek. */
function monthsFrom(from: string, count: number) {
  const out: { value: string; label: string }[] = [];
  let m = from;
  const cur = monthStart(new Date());
  for (let i = 0; i < count; i++) {
    out.push({ value: m, label: m === cur ? `${fmt(m)} (bu ay)` : fmt(m) });
    m = monthStart(addMonths(parseISO(m), 1));
  }
  return out;
}

function RentFields({
  contract,
  rent,
  dues,
  effective,
  setRent,
  setDues,
  setEffective,
  options,
}: {
  contract: Contract;
  rent: number;
  dues: number;
  effective: string;
  setRent: (n: number) => void;
  setDues: (n: number) => void;
  setEffective: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <View className="flex-1">
          <MoneyInput label="Yeni kira" value={rent} onChangeNumber={setRent} />
        </View>
        <View className="flex-1">
          <MoneyInput label="Aidat" value={dues} onChangeNumber={setDues} />
        </View>
      </View>
      <View>
        <Text className="mb-1.5 text-sm font-medium text-muted">Hangi aydan itibaren geçerli?</Text>
        <MonthChips options={options} value={effective} onChange={setEffective} />
      </View>
      <Text className="text-xs text-muted">
        {fmt(effective)} öncesi aylar {formatCurrency(contract.rentAmount + contract.duesAmount)}{' '}
        olarak kalır; alınmış tahsilatlar değişmez.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Uzat
// ---------------------------------------------------------------------------

export interface ExtendSubmit {
  endDate: string | null;
  autoRenew: boolean;
  rentChange: RentChangeInput | null;
}

export function ExtendSheet({
  contract,
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  contract: Contract;
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (v: ExtendSubmit) => void;
}) {
  const baseEnd = contract.endDate ? parseISO(contract.endDate) : new Date();
  const [endDate, setEndDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [withRent, setWithRent] = useState(false);
  const [rent, setRent] = useState(contract.rentAmount);
  const [dues, setDues] = useState(contract.duesAmount);
  const defaultEffective = useMemo(() => {
    const afterEnd = monthStart(addMonths(baseEnd, 1));
    const cur = monthStart(new Date());
    return afterEnd > cur ? afterEnd : cur;
  }, [contract.endDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const [effective, setEffective] = useState(defaultEffective);

  useEffect(() => {
    if (!visible) return;
    setEndDate(format(addYears(baseEnd, 1), 'yyyy-MM-dd'));
    setAutoRenew(contract.autoRenew ?? true);
    setWithRent(false);
    setRent(contract.rentAmount);
    setDues(contract.duesAmount);
    setEffective(defaultEffective);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(
    () => monthsFrom(monthStart(addMonths(new Date(), -3)) > trackingStartMonth(contract)
      ? monthStart(addMonths(new Date(), -3))
      : trackingStartMonth(contract), 18),
    [contract]
  );

  return (
    <Sheet visible={visible} title="Sözleşmeyi Uzat" onClose={onClose}>
      <View className="gap-3">
        <DateField label="Yeni bitiş tarihi" value={endDate} onChange={setEndDate} optional />
        <View className="flex-row items-center justify-between rounded-2xl bg-background px-4 py-3">
          <Text className="flex-1 pr-3 text-sm text-foreground">Bitişte yine aynı koşullarla uzasın</Text>
          <Switch
            value={autoRenew}
            onValueChange={setAutoRenew}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        </View>
        <View className="flex-row items-center justify-between rounded-2xl bg-background px-4 py-3">
          <Text className="flex-1 pr-3 text-sm text-foreground">Kira da değişiyor</Text>
          <Switch
            value={withRent}
            onValueChange={setWithRent}
            trackColor={{ true: palette.primary, false: palette.border }}
          />
        </View>
        {withRent ? (
          <RentFields
            contract={contract}
            rent={rent}
            dues={dues}
            effective={effective}
            setRent={setRent}
            setDues={setDues}
            setEffective={setEffective}
            options={options}
          />
        ) : null}
        <View className="mt-2">
          <Button
            label="Uzatmayı Kaydet"
            loading={submitting}
            disabled={submitting}
            onPress={() =>
              onSubmit({
                endDate: endDate || null,
                autoRenew,
                rentChange:
                  withRent && (rent !== contract.rentAmount || dues !== contract.duesAmount)
                    ? { effectiveMonth: effective, rentAmount: rent, duesAmount: dues }
                    : null,
              })
            }
          />
        </View>
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Kira artışı
// ---------------------------------------------------------------------------

export function RentChangeSheet({
  contract,
  visible,
  submitting,
  onClose,
  onSubmit,
}: {
  contract: Contract;
  visible: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (v: RentChangeInput) => void;
}) {
  const [rent, setRent] = useState(contract.rentAmount);
  const [dues, setDues] = useState(contract.duesAmount);
  const [effective, setEffective] = useState(monthStart(new Date()));
  useEffect(() => {
    if (!visible) return;
    setRent(contract.nextRentAmount ?? contract.rentAmount);
    setDues(contract.nextDuesAmount ?? contract.duesAmount);
    setEffective(contract.nextRentFrom ? monthStart(contract.nextRentFrom) : monthStart(new Date()));
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => {
    const t = trackingStartMonth(contract);
    const back = monthStart(addMonths(new Date(), -6));
    return monthsFrom(t > back ? t : back, 19);
  }, [contract]);

  return (
    <Sheet visible={visible} title="Kira Artışı" onClose={onClose}>
      {contract.nextRentFrom ? (
        <View className="mb-3 rounded-2xl bg-warning-soft p-3">
          <Text className="text-xs text-foreground">
            Planlı artış var: {formatMonth(contract.nextRentFrom)} itibarıyla{' '}
            {formatCurrency((contract.nextRentAmount ?? 0) + (contract.nextDuesAmount ?? 0))}. Yeni
            kayıt bunun yerine geçer.
          </Text>
        </View>
      ) : null}
      <RentFields
        contract={contract}
        rent={rent}
        dues={dues}
        effective={effective}
        setRent={setRent}
        setDues={setDues}
        setEffective={setEffective}
        options={options}
      />
      <View className="mt-4">
        <Button
          label="Kira Artışını Kaydet"
          loading={submitting}
          disabled={submitting || !(rent > 0)}
          onPress={() => onSubmit({ effectiveMonth: effective, rentAmount: rent, duesAmount: dues })}
        />
      </View>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Kiracı çıkışı
// ---------------------------------------------------------------------------

export interface ExitSubmit {
  input: TerminateInput;
  markUnitVacant: boolean;
}

export function ExitSheet({
  contract,
  visible,
  openDebt,
  submitting,
  onClose,
  onSubmit,
}: {
  contract: Contract;
  visible: boolean;
  /** Çıkış anındaki vadesi geçmiş borç (bilgi). */
  openDebt: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (v: ExitSubmit) => void;
}) {
  const colors = useThemeColors();
  const [exitDate, setExitDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [returned, setReturned] = useState(contract.depositAmount);
  const [deduction, setDeduction] = useState(0);
  const [note, setNote] = useState('');
  const [vacant, setVacant] = useState(true);
  useEffect(() => {
    if (!visible) return;
    setExitDate(format(new Date(), 'yyyy-MM-dd'));
    setReturned(contract.depositAmount);
    setDeduction(0);
    setNote('');
    setVacant(true);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const unbalanced = contract.depositAmount > 0 && returned + deduction !== contract.depositAmount;

  return (
    <Sheet visible={visible} title="Kiracı Çıkışı" onClose={onClose}>
      <View className="gap-3">
        <DateField label="Çıkış tarihi" value={exitDate} onChange={setExitDate} />
        <Text className="-mt-1 text-xs text-muted">
          {exitDate ? `${formatMonth(exitDate)} sonrası için kira borcu oluşmaz.` : ''}
        </Text>
        <Text className="text-sm font-semibold text-foreground">
          Depozito ({formatCurrency(contract.depositAmount)})
        </Text>
        <View className="flex-row gap-3">
          <View className="flex-1">
            <MoneyInput
              label="İade edilen"
              value={returned}
              onChangeNumber={(n) => {
                setReturned(n);
                if (contract.depositAmount > 0) setDeduction(Math.max(contract.depositAmount - n, 0));
              }}
            />
          </View>
          <View className="flex-1">
            <MoneyInput label="Kesinti" value={deduction} onChangeNumber={setDeduction} />
          </View>
        </View>
        {unbalanced ? (
          <Text className="text-xs text-warning">
            İade + kesinti depozitoya eşit değil ({formatCurrency(returned + deduction)}).
          </Text>
        ) : null}
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Kesinti nedeni / not (opsiyonel)"
          placeholderTextColor={colors.textMuted}
          className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
        />
        {contract.unitId ? (
          <View className="flex-row items-center justify-between rounded-2xl bg-background px-4 py-3">
            <Text className="flex-1 pr-3 text-sm text-foreground">Daireyi boş olarak işaretle</Text>
            <Switch
              value={vacant}
              onValueChange={setVacant}
              trackColor={{ true: palette.primary, false: palette.border }}
            />
          </View>
        ) : (
          <Text className="text-xs text-muted">
            Daire envantere bağlı değil; doluluk sözleşmeden hesaplandığı için çıkışla birlikte boş
            görünür.
          </Text>
        )}
        {openDebt > 0 ? (
          <View className="rounded-2xl bg-danger-soft p-3">
            <Text className="text-xs text-foreground">
              Kalan borç {formatCurrency(openDebt)} silinmez; çıkıştan sonra da tahsil edilebilir.
            </Text>
          </View>
        ) : null}
        <View className="mt-2">
          <Button
            label="Çıkışı Kaydet"
            variant="danger"
            loading={submitting}
            disabled={submitting || !exitDate}
            onPress={() =>
              onSubmit({
                input: {
                  exitDate,
                  depositReturned: returned,
                  depositDeduction: deduction,
                  depositNote: note.trim() || null,
                },
                markUnitVacant: vacant,
              })
            }
          />
        </View>
      </View>
    </Sheet>
  );
}
