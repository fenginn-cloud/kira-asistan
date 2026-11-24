import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { PORTFOLIO_OPTIONS, REFERRAL_OPTIONS, ROLE_OPTIONS } from './signupSurvey';

/** Bu tarihten önce oluşturulan hesaplara anket gösterilmez (ISO, UTC). */
const SURVEY_START = '2026-11-24T00:00:00Z';

/** Tek seçimli, eşit genişlikte seçenek ızgarası. Seçiliye tekrar dokununca kalkar. */
function OptionGrid({
  label,
  options,
  value,
  onChange,
  columns,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  columns: number;
}) {
  const rows: string[][] = [];
  for (let i = 0; i < options.length; i += columns)
    rows.push(options.slice(i, i + columns));
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row gap-2">
          {row.map((opt) => {
            const active = value === opt;
            return (
              <Pressable
                key={opt}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => onChange(active ? null : opt)}
                className={`h-11 flex-1 items-center justify-center rounded-xl border ${
                  active ? 'border-primary bg-primary/10' : 'border-border bg-background'
                }`}
              >
                <Text
                  numberOfLines={1}
                  className={`text-[13px] font-semibold ${active ? 'text-primary-700' : 'text-muted'}`}
                >
                  {opt}
                </Text>
              </Pressable>
            );
          })}
          {Array.from({ length: columns - row.length }).map((_, k) => (
            <View key={`pad-${k}`} className="flex-1" />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Hesap doğrulandıktan sonra uygulama İLK açıldığında bir kez sorulan kısa
 * tanışma anketi (rol / portföy / nereden duydu). Google/Apple ile girenler
 * dahil yeni kayıt olan herkese gelir (SURVEY_START sonrası); personel hesaplarına sorulmaz. Görüldü bilgisi kullanıcı
 * metadata'sında (`survey_seen`) tutulur, böylece her cihazda bir kez çıkar.
 */
export function WelcomeSurvey() {
  const user = useAuthStore((s) => s.user);
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<string | null>(null);
  const [referral, setReferral] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user || user.role === 'personnel' || !isSupabaseConfigured || !supabase)
        return;
      try {
        const { data } = await supabase.auth.getUser();
        const authUser = data.user;
        if (!authUser || authUser.user_metadata?.survey_seen) return;
        // Yalnızca bu özellik yayına girdikten SONRA kayıt olanlara sorulur;
        // mevcut kullanıcılara hiç gösterilmez.
        if (!authUser.created_at || authUser.created_at < SURVEY_START) return;
        // Eski sürümde kayıt ekranında yanıtlamış olanlara tekrar sorma.
        const { count } = await supabase
          .from('signup_surveys')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', authUser.id);
        if (count && count > 0) {
          await supabase.auth.updateUser({ data: { survey_seen: true } });
          return;
        }
        if (!cancelled) setVisible(true);
      } catch {
        /* anket opsiyonel — sessiz geç */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const finish = async (submit: boolean) => {
    setSaving(true);
    try {
      if (supabase) {
        if (submit && (role || portfolio || referral)) {
          await supabase
            .from('signup_surveys')
            .insert({ role, portfolio_size: portfolio, referral });
        }
        await supabase.auth.updateUser({ data: { survey_seen: true } });
      }
    } catch {
      /* sessiz geç */
    } finally {
      setSaving(false);
      setVisible(false);
    }
  };

  if (!visible) return null;
  const answered = [role, portfolio, referral].filter(Boolean).length;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => finish(false)}>
      <View className="flex-1 items-center justify-center bg-black/50 px-5">
        <View
          className="w-full max-w-[440px] rounded-3xl bg-surface"
          style={{ maxHeight: '90%' }}
        >
          <ScrollView contentContainerStyle={{ padding: 22, gap: 18 }}>
            <View className="gap-1">
              <Text className="text-xl font-bold text-foreground">Hoş geldiniz 👋</Text>
              <Text className="text-sm leading-5 text-muted">
                Sizi biraz tanıyalım; Kira Asistan'ı ihtiyaçlarınıza göre geliştirmemize
                yardımcı olur. 3 kısa soru, isterseniz atlayabilirsiniz.
              </Text>
            </View>
            <OptionGrid
              label="Rolünüz"
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
              columns={2}
            />
            <OptionGrid
              label="Kaç daire / sözleşme takip ediyorsunuz?"
              options={PORTFOLIO_OPTIONS}
              value={portfolio}
              onChange={setPortfolio}
              columns={4}
            />
            <OptionGrid
              label="Bizi nereden duydunuz?"
              options={REFERRAL_OPTIONS}
              value={referral}
              onChange={setReferral}
              columns={2}
            />
            <View className="gap-2 pt-1">
              <Button
                label={answered > 0 ? 'Gönder ve başla' : 'Başla'}
                onPress={() => finish(true)}
                loading={saving}
              />
              <Pressable
                onPress={() => finish(false)}
                disabled={saving}
                className="h-10 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-muted">Şimdilik atla</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
