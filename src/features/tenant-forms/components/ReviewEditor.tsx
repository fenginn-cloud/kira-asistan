import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSaveReview } from '../hooks';
import { RESULT_COLORS, RESULT_LABELS } from '../config';
import { errorMessage } from '@/lib/utils/error';
import { palette } from '@/lib/theme/colors';
import type { TenantForm, TenantFormResult } from '@/types';

const RESULTS: TenantFormResult[] = ['suitable', 'need_docs', 'unsuitable', 'unrated'];

interface Props {
  form: TenantForm;
  /** Auto-computed net income / rent ratio, if the form is linked to a contract. */
  incomeRatio: number | null;
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        placeholderTextColor="#9CA3AF"
        className={`rounded-2xl border border-border bg-surface px-4 text-base text-foreground ${
          multiline ? 'min-h-[80px] py-3' : 'h-14'
        }`}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export function ReviewEditor({ form, incomeRatio }: Props) {
  const toast = useToast();
  const save = useSaveReview(form.id);
  const r = form.review;

  const [generalNote, setGeneralNote] = useState(r?.generalNote ?? '');
  const [landlordReference, setLandlordReference] = useState(r?.landlordReference ?? '');
  const [incomeVerification, setIncomeVerification] = useState(r?.incomeVerification ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(r?.additionalNotes ?? '');
  const [result, setResult] = useState<TenantFormResult>(r?.result ?? 'unrated');

  const onSave = () => {
    save.mutate(
      {
        generalNote: generalNote.trim() || null,
        landlordReference: landlordReference.trim() || null,
        incomeVerification: incomeVerification.trim() || null,
        additionalNotes: additionalNotes.trim() || null,
        incomeRentRatio: incomeRatio ?? null,
        result,
      },
      {
        onSuccess: () => toast.success('Değerlendirme kaydedildi'),
        onError: (e) => toast.error(errorMessage(e, 'Kaydedilemedi')),
      }
    );
  };

  return (
    <Card>
      {/* Income / rent ratio */}
      {incomeRatio !== null ? (
        <View className="mb-4 rounded-2xl bg-primary-50 p-4">
          <Text className="text-xs font-medium text-muted">Gelir / Kira Oranı</Text>
          <Text className="mt-0.5 text-2xl font-bold text-primary-700">
            {incomeRatio.toFixed(1).replace('.', ',')}x
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            Aylık net gelirin, aylık kiraya oranı. Genelde 3x ve üzeri güvenli kabul edilir.
          </Text>
        </View>
      ) : null}

      <View className="gap-4">
        <Field label="Genel değerlendirme" value={generalNote} onChange={setGeneralNote} multiline />
        <Field label="Önceki ev sahibi referansı" value={landlordReference} onChange={setLandlordReference} multiline />
        <Field label="İş/gelir doğrulaması" value={incomeVerification} onChange={setIncomeVerification} multiline />
        <Field label="Ek notlar" value={additionalNotes} onChange={setAdditionalNotes} multiline />

        {/* Result */}
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted">Sonuç</Text>
          <View className="flex-row flex-wrap gap-2">
            {RESULTS.map((res) => {
              const active = result === res;
              const c = RESULT_COLORS[res];
              return (
                <Pressable
                  key={res}
                  onPress={() => setResult(res)}
                  className={`flex-row items-center gap-1.5 rounded-2xl border px-3.5 py-2.5 ${
                    active ? `border-primary ${c.bg}` : 'border-border bg-surface'
                  }`}
                >
                  {active ? <Check size={14} color={palette.primary} /> : null}
                  <Text className={`text-sm font-medium ${active ? c.text : 'text-muted'}`}>
                    {RESULT_LABELS[res]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Button label="Değerlendirmeyi Kaydet" onPress={onSave} loading={save.isPending} />
      </View>
    </Card>
  );
}
