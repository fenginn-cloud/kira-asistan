import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Copy, Check, MessageCircle, X } from 'lucide-react-native';
import { useToast } from '@/components/ui/Toast';
import { copyText, openWhatsApp } from '@/lib/utils/contact';
import { palette } from '@/lib/theme/colors';

interface Props {
  visible: boolean;
  message: string;
  phone?: string;
  onClose: () => void;
}

export function MessageModal({ visible, message, phone, onClose }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(message);
    setCopied(true);
    toast.success('Mesaj kopyalandı');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (phone) openWhatsApp(phone, message);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-surface p-5 pb-10">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-[#0B1220]">Hatırlatma Mesajı</Text>
            <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center">
              <X size={22} color="#6B7280" />
            </Pressable>
          </View>

          <View className="rounded-2xl border border-border bg-background p-4">
            <Text className="text-base leading-6 text-[#0B1220]">{message}</Text>
          </View>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={handleCopy}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary-50 py-4 active:opacity-80"
            >
              {copied ? (
                <Check size={18} color={palette.success} />
              ) : (
                <Copy size={18} color={palette.primary} />
              )}
              <Text className="font-semibold text-primary-700">
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </Text>
            </Pressable>
            {phone ? (
              <Pressable
                onPress={handleWhatsApp}
                className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-[#E7F8EF] py-4 active:opacity-80"
              >
                <MessageCircle size={18} color="#1FA855" />
                <Text className="font-semibold text-[#1FA855]">WhatsApp Aç</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
