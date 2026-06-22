import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Send, Sparkles, Info } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { AIAssistantCards } from '@/components/AIAssistantCards';
import { useToast } from '@/components/ui/Toast';
import { useThemeColors } from '@/lib/theme/useThemeColors';
import { useContracts } from '@/features/contracts/hooks';
import { askAssistant, isAIAvailable } from '@/services/aiAssistant';
import { openWhatsApp } from '@/lib/utils/contact';
import { formatCurrency } from '@/lib/utils/format';
import { formatMonthTR } from '@/lib/ledger/ledger';
import { errorMessage } from '@/lib/utils/error';
import { palette } from '@/lib/theme/colors';
import { AI_QUICK_QUESTIONS, type AIResponse, type AISuggestedAction } from '@/utils/aiSchemas';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text?: string;
  response?: AIResponse;
  error?: boolean;
}

const DISCLAIMER =
  'Bu cevap kayıtlı verilerinize göre hazırlanmıştır; bir öneridir. Hukuki veya mali danışmanlık değildir. İşlem yapmadan önce kontrol edin.';

let counter = 0;
const nextId = () => `m${++counter}`;

export function AIAssistantChat() {
  const router = useRouter();
  const toast = useToast();
  const colors = useThemeColors();
  const scrollRef = useRef<ScrollView>(null);
  const { data: contracts = [] } = useContracts();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId(), role: 'user', text: q }]);
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      const response = await askAssistant(q);
      setMessages((m) => [...m, { id: nextId(), role: 'assistant', response }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'assistant', text: errorMessage(e, 'Cevap alınamadı.'), error: true },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  const handleAction = (action: AISuggestedAction) => {
    if (action.type === 'VIEW_OVERDUE' || action.type === 'VIEW_CONTRACTS') {
      router.push('/(app)/(tabs)/contracts');
      return;
    }
    if (action.type === 'CREATE_WHATSAPP_REMINDER') {
      const name = action.tenant_name.trim().toLowerCase();
      const contract =
        contracts.find((c) => c.tenantName.trim().toLowerCase() === name) ??
        contracts.find((c) => c.tenantName.trim().toLowerCase().includes(name));
      if (!contract) {
        toast.error('Kiracı bulunamadı');
        return;
      }
      const loc = [contract.propertyName, contract.block, contract.unit]
        .filter(Boolean)
        .join(' ');
      const tutar = formatCurrency(contract.rentAmount + contract.duesAmount);
      const ay = formatMonthTR(new Date().toISOString().slice(0, 7) + '-01');
      const msg = `Sayın ${contract.tenantName},

${loc} için ${ay} ayına ait ${tutar} kira ödemeniz beklenmektedir.

Ödeme yaptıysanız dekont paylaşmanızı rica ederiz.`;
      void openWhatsApp(contract.tenantPhone, msg);
    }
  };

  if (!isAIAvailable) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header />
        <EmptyState
          icon={Sparkles}
          title="AI Asistan canlı modda çalışır"
          description="Supabase bağlantısı etkinleştiğinde sorularınızı yanıtlar."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-5 pb-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View className="mt-2">
              <Text className="text-lg font-bold text-foreground">
                Bugün neyi takip edelim?
              </Text>
              <Text className="mt-1 text-sm text-muted">
                Sözleşme, ödeme ve cari hesap verilerinize göre yanıtlarım.
              </Text>
              <View className="mt-4 gap-2">
                {AI_QUICK_QUESTIONS.map((qq) => (
                  <Pressable
                    key={qq}
                    onPress={() => send(qq)}
                    className="flex-row items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80"
                  >
                    <Sparkles size={16} color={palette.primary} />
                    <Text className="text-sm font-medium text-foreground">{qq}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <View className="gap-4 pt-2">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <View key={m.id} className="items-end">
                    <View className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5">
                      <Text className="text-sm text-white">{m.text}</Text>
                    </View>
                  </View>
                ) : (
                  <View key={m.id} className="items-start gap-2">
                    {m.error ? (
                      <View className="max-w-[90%] rounded-2xl bg-danger-soft px-4 py-3">
                        <Text className="text-sm text-danger">{m.text}</Text>
                      </View>
                    ) : m.response ? (
                      <View className="w-full gap-3">
                        <View className="rounded-2xl rounded-tl-sm bg-surface border border-border px-4 py-3">
                          <Text className="text-sm text-foreground">{m.response.answer}</Text>
                        </View>
                        <AIAssistantCards response={m.response} onAction={handleAction} />
                        <View className="flex-row items-start gap-1.5 px-1">
                          <Info size={12} color={colors.textMuted} />
                          <Text className="flex-1 text-[11px] leading-4 text-muted">
                            {DISCLAIMER}
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                )
              )}
              {loading ? (
                <View className="flex-row items-center gap-2 px-1">
                  <ActivityIndicator size="small" color={palette.primary} />
                  <Text className="text-sm text-muted">Düşünüyor…</Text>
                </View>
              ) : null}
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View className="border-t border-border bg-surface px-4 py-3">
          <View className="flex-row items-end gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Bir soru yazın…"
              placeholderTextColor={colors.textMuted}
              multiline
              className="max-h-24 flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-base text-foreground"
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={loading || !input.trim()}
              className={`h-11 w-11 items-center justify-center rounded-2xl ${
                loading || !input.trim() ? 'bg-border' : 'bg-primary active:opacity-80'
              }`}
            >
              <Send size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View className="flex-row items-center gap-2 px-5 pt-2 pb-1">
      <Sparkles size={22} color={palette.primary} />
      <Text className="text-2xl font-bold text-foreground">AI Asistan</Text>
    </View>
  );
}
