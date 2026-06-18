import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Camera, Paperclip, X } from 'lucide-react-native';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Input } from '@/components/ui/Input';
import { DateField } from '@/components/ui/DateField';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatMonth } from '@/lib/utils/format';
import { remainingDebt } from '@/lib/utils/payments';
import { PAYMENT_METHOD_LABEL, type Payment, type PaymentMethod } from '@/types';
import { palette } from '@/lib/theme/colors';

export interface ReceiptFile {
  uri: string;
  name: string;
  mimeType: string | null;
}

export interface AddTransactionInput {
  amount: number;
  paidAt: string;
  method: PaymentMethod;
  description: string | null;
  receipt: ReceiptFile | null;
}

interface Props {
  visible: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSubmit: (input: AddTransactionInput) => void;
  isSubmitting?: boolean;
}

const METHODS = Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[];

export function AddTransactionModal({
  visible,
  payment,
  onClose,
  onSubmit,
  isSubmitting,
}: Props) {
  const toast = useToast();
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [description, setDescription] = useState('');
  const [receipt, setReceipt] = useState<ReceiptFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset + prefill the amount with the remaining debt whenever the sheet opens.
  useEffect(() => {
    if (visible && payment) {
      setAmount(remainingDebt(payment));
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setMethod(null);
      setDescription('');
      setReceipt(null);
      setError(null);
    }
  }, [visible, payment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('Fotoğraf erişim izni gerekli');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const a = res.assets?.[0];
    if (!res.canceled && a) {
      setReceipt({
        uri: a.uri,
        name: a.fileName ?? `dekont_${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
      });
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    const a = res.assets?.[0];
    if (!res.canceled && a) {
      setReceipt({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? null });
    }
  };

  const handleSubmit = () => {
    setError(null);
    if (!amount || amount <= 0) {
      setError('Geçerli bir tutar girin.');
      return;
    }
    if (!method) {
      setError('Lütfen bir ödeme yöntemi seçin.');
      return;
    }
    onSubmit({
      amount,
      paidAt: date,
      method,
      description: description.trim() || null,
      receipt,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <View className="max-h-[88%] rounded-t-3xl bg-surface p-5 pb-8">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-[#0B1220]">Ödeme Ekle</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {payment ? (
              <View className="mb-4 rounded-2xl bg-background p-3">
                <Text className="text-sm text-muted">
                  {formatMonth(payment.periodMonth)} dönemi
                </Text>
                <Text className="text-sm font-semibold text-danger">
                  Kalan borç: {formatCurrency(remainingDebt(payment))}
                </Text>
              </View>
            ) : null}

            <View className="gap-3">
              <MoneyInput label="Tutar" value={amount} onChangeNumber={setAmount} />

              {/* Payment method (required) */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-muted">Ödeme Yöntemi *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {METHODS.map((m) => {
                    const active = method === m;
                    return (
                      <Pressable
                        key={m}
                        onPress={() => setMethod(m)}
                        className={`rounded-2xl px-4 py-3 ${
                          active ? 'bg-primary' : 'bg-background'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            active ? 'text-white' : 'text-muted'
                          }`}
                        >
                          {PAYMENT_METHOD_LABEL[m]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <DateField label="Tarih" value={date} onChange={setDate} />

              <Input
                label="Açıklama (opsiyonel)"
                value={description}
                onChangeText={setDescription}
                placeholder="Havale, nakit vb."
              />

              {/* Receipt (optional) */}
              <View className="gap-1.5">
                <Text className="text-sm font-medium text-muted">Dekont (opsiyonel)</Text>
                {receipt ? (
                  <View className="flex-row items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
                    <Text className="flex-1 text-sm text-[#0B1220]" numberOfLines={1}>
                      {receipt.name}
                    </Text>
                    <Pressable onPress={() => setReceipt(null)} hitSlop={8}>
                      <X size={18} color={palette.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={pickPhoto}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-background py-3 active:opacity-80"
                    >
                      <Camera size={16} color={palette.primary} />
                      <Text className="text-sm font-semibold text-primary-700">Fotoğraf</Text>
                    </Pressable>
                    <Pressable
                      onPress={pickFile}
                      className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-background py-3 active:opacity-80"
                    >
                      <Paperclip size={16} color={palette.primary} />
                      <Text className="text-sm font-semibold text-primary-700">Dosya</Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {error ? <Text className="text-xs text-danger">{error}</Text> : null}

              <View className="mt-2">
                <Button label="Ödemeyi Kaydet" onPress={handleSubmit} loading={isSubmitting} />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
