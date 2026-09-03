import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/** Kayıt öncesi anket cevapları (rol / portföy / nereden duydu). */
export interface SignupSurvey {
  role: string | null;
  portfolioSize: string | null;
  referral: string | null;
}

export const ROLE_OPTIONS = ['Mülk sahibi', 'Emlakçı', 'Portföy yöneticisi', 'Diğer'];
export const PORTFOLIO_OPTIONS = ['1-5', '6-20', '21-50', '50+'];
export const REFERRAL_OPTIONS = ['Tavsiye', 'Instagram', 'Google', 'Diğer'];

interface SurveyState extends SignupSurvey {
  set: (patch: Partial<SignupSurvey>) => void;
  reset: () => void;
}

/** Kayıt ekranı ile OTP-sonrası yazma arasında cevapları taşıyan geçici store. */
export const useSignupSurveyStore = create<SurveyState>((set) => ({
  role: null,
  portfolioSize: null,
  referral: null,
  set: (patch) => set(patch),
  reset: () => set({ role: null, portfolioSize: null, referral: null }),
}));

/**
 * Anketi kaydeder (hesap kurulduktan SONRA, kimlik doğrulanmış halde çağrılır).
 * En iyi çaba: hata olsa da kayıt akışını bozmaz. Boş anket yazılmaz.
 */
export async function submitSignupSurvey(): Promise<void> {
  const { role, portfolioSize, referral } = useSignupSurveyStore.getState();
  if (!role && !portfolioSize && !referral) return;
  try {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('signup_surveys').insert({
        role,
        portfolio_size: portfolioSize,
        referral,
      });
    }
  } catch {
    /* anket opsiyonel — sessiz geç */
  } finally {
    useSignupSurveyStore.getState().reset();
  }
}
