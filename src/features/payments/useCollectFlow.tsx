import { useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { CollectSheet, type CollectSubmit } from './components/CollectSheet';
import { newClientRef, useCollectPayment, useUndoCollection } from './hooks';
import { notifyTeamPaymentReceived } from '@/services/notifyTeam';
import { errorMessage } from '@/lib/utils/error';
import { formatCurrency } from '@/lib/utils/format';
import { periodLabel } from '@/lib/ledger/ledger';
import type { Contract, Payment } from '@/types';

/**
 * Ortak tahsilat akışı: ana sayfa "Alındı" ve Sözleşmeler "Tahsilat Gir" aynı
 * pencereyi, aynı kayıt yolunu ve aynı "Geri al" bildirimini kullanır.
 *
 * Tekrar koruması: pencere her açıldığında yeni bir işlem anahtarı üretilir;
 * çift tıklama veya ağ tekrarı aynı anahtarla gelir → ikinci kayıt oluşmaz.
 */
export function useCollectFlow(allPayments: Payment[]) {
  const toast = useToast();
  const collect = useCollectPayment();
  const undo = useUndoCollection();
  const [target, setTarget] = useState<{ contract: Contract; paymentId?: string | null } | null>(
    null
  );
  const clientRef = useRef<string>(newClientRef());

  const contractPayments = useMemo(
    () => (target ? allPayments.filter((p) => p.contractId === target.contract.id) : []),
    [allPayments, target]
  );

  const open = (contract: Contract, paymentId?: string | null) => {
    clientRef.current = newClientRef();
    setTarget({ contract, paymentId });
  };

  const confirm = ({ payment, amount, note }: CollectSubmit) => {
    if (!target || collect.isPending) return;
    const contract = target.contract;
    collect.mutate(
      {
        contractId: contract.id,
        paymentId: payment.id,
        amount,
        paidAt: new Date().toISOString().slice(0, 10),
        method: null,
        description: note ?? 'Tahsilat (hızlı giriş)',
        receiptUrl: null,
        clientRef: clientRef.current,
      },
      {
        onSuccess: ({ transactionId }) => {
          setTarget(null);
          toast.success(`${periodLabel(payment)} · ${formatCurrency(amount)} kaydedildi`, {
            action: {
              label: 'Geri al',
              onPress: () =>
                undo.mutate(
                  { transactionId, contractId: contract.id },
                  {
                    onSuccess: () => toast.info('Tahsilat geri alındı'),
                    onError: (e) => toast.error(errorMessage(e, 'Geri alınamadı')),
                  }
                ),
            },
          });
          void notifyTeamPaymentReceived(contract.id, note);
        },
        onError: (e) => toast.error(errorMessage(e, 'Tahsilat kaydedilemedi')),
      }
    );
  };

  const element = (
    <CollectSheet
      contract={target?.contract ?? null}
      payments={contractPayments}
      preferredPaymentId={target?.paymentId ?? null}
      submitting={collect.isPending}
      onClose={() => setTarget(null)}
      onConfirm={confirm}
    />
  );

  return { open, element };
}
