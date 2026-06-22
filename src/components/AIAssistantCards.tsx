import { Text, View, Pressable } from 'react-native';
import { Building2, MessageCircle, ArrowRight } from 'lucide-react-native';
import { palette } from '@/lib/theme/colors';
import type { AIResponse, AISuggestedAction } from '@/utils/aiSchemas';

function amountColor(amount: string): string {
  if (amount.trim().startsWith('-')) return 'text-danger';
  if (/^[1-9]/.test(amount.trim())) return 'text-success';
  return 'text-foreground';
}

/**
 * Renders the structured AI answer: summary cards, item list and
 * suggested-action buttons. Pure presentation; actions bubble up.
 */
export function AIAssistantCards({
  response,
  onAction,
}: {
  response: AIResponse;
  onAction: (action: AISuggestedAction) => void;
}) {
  const { summary_cards, items, suggested_actions } = response;
  return (
    <View className="gap-3">
      {/* Summary cards */}
      {summary_cards.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {summary_cards.map((c, i) => (
            <View
              key={`${c.title}-${i}`}
              className="min-w-[45%] flex-1 rounded-2xl border border-border bg-surface p-3"
            >
              <Text className="text-xs text-muted" numberOfLines={1}>
                {c.title}
              </Text>
              <Text className="mt-1 text-lg font-bold text-foreground" numberOfLines={1}>
                {c.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Items */}
      {items.length > 0 ? (
        <View className="gap-2">
          {items.map((it, i) => (
            <View
              key={`${it.tenant_name}-${i}`}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3"
            >
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary-50">
                <Building2 size={17} color={palette.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {it.tenant_name || '—'}
                </Text>
                <Text className="text-xs text-muted" numberOfLines={1}>
                  {it.property_name}
                  {it.note ? ` • ${it.note}` : ''}
                </Text>
              </View>
              <View className="items-end">
                {it.amount ? (
                  <Text className={`text-sm font-bold ${amountColor(it.amount)}`}>
                    {it.amount}
                  </Text>
                ) : null}
                {it.status ? (
                  <Text className="text-[11px] text-muted">{it.status}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Suggested actions */}
      {suggested_actions.filter((a) => a.type !== 'NONE').length > 0 ? (
        <View className="gap-2">
          {suggested_actions
            .filter((a) => a.type !== 'NONE')
            .map((a, i) => (
              <Pressable
                key={`${a.label}-${i}`}
                onPress={() => onAction(a)}
                className="flex-row items-center justify-between rounded-2xl bg-primary-50 px-4 py-3 active:opacity-80"
              >
                <View className="flex-1 flex-row items-center gap-2">
                  {a.type === 'CREATE_WHATSAPP_REMINDER' ? (
                    <MessageCircle size={16} color={palette.success} />
                  ) : (
                    <ArrowRight size={16} color={palette.primary} />
                  )}
                  <Text className="flex-1 text-sm font-semibold text-primary-700">
                    {a.label}
                  </Text>
                </View>
              </Pressable>
            ))}
        </View>
      ) : null}
    </View>
  );
}
