import { Linking, Pressable, Text, View } from 'react-native';
import { Eye, Receipt } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatShortDate } from '@/lib/utils/format';
import { getDocumentViewUrl } from '@/services/storage';
import { PAYMENT_METHOD_LABEL, type PaymentTransaction } from '@/types';
import { palette } from '@/lib/theme/colors';

export function TransactionItem({ tx }: { tx: PaymentTransaction }) {
  const toast = useToast();

  const viewReceipt = async () => {
    if (!tx.receiptUrl) return;
    try {
      const url = await getDocumentViewUrl(tx.receiptUrl);
      Linking.openURL(url);
    } catch {
      toast.error('Dekont açılamadı');
    }
  };

  return (
    <Card>
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-foreground">
            {formatCurrency(tx.amount)}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">
            {formatShortDate(tx.paidAt)}
            {tx.method ? ` • ${PAYMENT_METHOD_LABEL[tx.method]}` : ''}
          </Text>
          {tx.description ? (
            <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
              {tx.description}
            </Text>
          ) : null}
        </View>

        {tx.receiptUrl ? (
          <Pressable
            onPress={viewReceipt}
            className="flex-row items-center gap-1.5 rounded-2xl bg-primary-50 px-3 py-2 active:opacity-80"
          >
            <Eye size={15} color={palette.primary} />
            <Text className="text-xs font-semibold text-primary-700">Dekont</Text>
          </Pressable>
        ) : (
          <Receipt size={18} color={palette.border} />
        )}
      </View>
    </Card>
  );
}
