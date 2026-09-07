import { useEffect, useRef, useState } from 'react';
import {
  Image,
  Linking,
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Menu,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { PLANS } from '@/features/subscription/plans';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '@/content/legal';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from './config';

const NAV = [
  { key: 'features', label: 'Özellikler' },
  { key: 'how', label: 'Nasıl Çalışır?' },
  { key: 'who', label: 'Kimler İçin?' },
  { key: 'pricing', label: 'Fiyatlandırma' },
  { key: 'faq', label: 'SSS' },
] as const;

const FMT = new Intl.NumberFormat('tr-TR');

export function LandingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Kira Asistan | Kira ve Mülk Yönetimi';
    // Uygulamanın mobil-kolon kısıtını landing'de kaldır (tam genişlik).
    document.documentElement.classList.add('landing-web');
    return () => document.documentElement.classList.remove('landing-web');
  }, []);

  const scrollTo = (key: string) => {
    setMenuOpen(false);
    scrollRef.current?.scrollTo({ y: Math.max(0, (offsets.current[key] ?? 0) - 8), animated: true });
  };
  const onSectionLayout = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };

  const goRegister = () => router.push('/(auth)/register');
  const goLogin = () => router.push('/(auth)/login');
  const goApp = () => router.push('/(app)/(tabs)');

  return (
    <View className="flex-1 bg-white">
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* ---------- HEADER ---------- */}
        <View className="w-full items-center border-b border-neutral-200 bg-white/95">
          <View
            className="w-full max-w-[1160px] flex-row items-center justify-between px-5 py-3"
          >
            <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} className="flex-row items-center gap-2">
              <Image source={require('../../../assets/icon.png')} style={{ width: 30, height: 30, borderRadius: 8 }} />
              <Text className="text-lg font-extrabold text-neutral-900">Kira Asistan</Text>
            </Pressable>

            {isDesktop ? (
              <View className="flex-row items-center gap-6">
                {NAV.map((n) => (
                  <Pressable key={n.key} onPress={() => scrollTo(n.key)}>
                    <Text className="text-sm font-medium text-neutral-600">{n.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2">
              {user ? (
                <Pressable onPress={goApp} className="rounded-xl bg-neutral-900 px-4 py-2 active:opacity-80">
                  <Text className="text-sm font-semibold text-white">Uygulamaya Git</Text>
                </Pressable>
              ) : isDesktop ? (
                <>
                  <Pressable onPress={goLogin} className="px-3 py-2">
                    <Text className="text-sm font-semibold text-neutral-700">Giriş Yap</Text>
                  </Pressable>
                  <Pressable onPress={goRegister} className="rounded-xl bg-neutral-900 px-4 py-2 active:opacity-80">
                    <Text className="text-sm font-semibold text-white">Kayıt Ol</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => setMenuOpen((v) => !v)} className="h-10 w-10 items-center justify-center rounded-xl border border-neutral-200">
                  {menuOpen ? <X size={20} color="#111" /> : <Menu size={20} color="#111" />}
                </Pressable>
              )}
            </View>
          </View>

          {/* Mobile menu */}
          {!isDesktop && menuOpen ? (
            <View className="w-full max-w-[1160px] gap-1 border-t border-neutral-200 px-5 py-3">
              {NAV.map((n) => (
                <Pressable key={n.key} onPress={() => scrollTo(n.key)} className="py-2.5">
                  <Text className="text-base font-medium text-neutral-700">{n.label}</Text>
                </Pressable>
              ))}
              <View className="mt-2 flex-row gap-2">
                <Pressable onPress={goLogin} className="flex-1 items-center rounded-xl border border-neutral-200 py-3">
                  <Text className="text-sm font-semibold text-neutral-800">Giriş Yap</Text>
                </Pressable>
                <Pressable onPress={goRegister} className="flex-1 items-center rounded-xl bg-neutral-900 py-3">
                  <Text className="text-sm font-semibold text-white">Kayıt Ol</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* ---------- HERO ---------- */}
        <Section max={1160}>
          <View className={isDesktop ? 'flex-row items-center gap-12 py-16' : 'gap-10 py-12'}>
            <View className={isDesktop ? 'flex-1' : ''}>
              <View className="self-start rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1">
                <Text className="text-xs font-semibold text-neutral-600">Kira takibinden fazlası.</Text>
              </View>
              <Text className={`mt-4 font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-5xl' : 'text-4xl'}`}>
                Kira yönetiminin daha akıllı yolu.
              </Text>
              <Text className="mt-4 text-lg leading-7 text-neutral-500">
                Sözleşmelerinizi, kira ödemelerinizi, kiracılarınızı ve mülklerinizi tek bir yerden yönetin.
              </Text>
              <View className="mt-7 flex-row flex-wrap gap-3">
                <Pressable onPress={goRegister} className="rounded-2xl bg-neutral-900 px-6 py-3.5 active:opacity-80">
                  <Text className="text-base font-semibold text-white">Ücretsiz Başla</Text>
                </Pressable>
                <Pressable onPress={() => scrollTo('how')} className="rounded-2xl border border-neutral-300 px-6 py-3.5 active:opacity-70">
                  <Text className="text-base font-semibold text-neutral-800">Nasıl Çalışır?</Text>
                </Pressable>
              </View>
            </View>
            <View className={isDesktop ? 'flex-1' : ''}>
              <HeroMockup />
            </View>
          </View>
        </Section>

        {/* ---------- SEKTÖR ŞERİDİ ---------- */}
        <View className="w-full items-center border-y border-neutral-200 bg-neutral-50">
          <View className="w-full max-w-[1160px] px-5 py-8">
            <Text className="text-center text-xs font-semibold uppercase tracking-widest text-neutral-400">
              Gayrimenkul sektörü için tasarlandı
            </Text>
            <View className="mt-5 flex-row flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {['Ece Gayrimenkul', 'Nova Emlak', 'Marmara Gayrimenkul', 'Kent Portföy', 'Prime Estate'].map((n) => (
                <Text key={n} className="text-base font-bold text-neutral-300">{n}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* ---------- ÖZELLİKLER ---------- */}
        <View onLayout={onSectionLayout('features')}>
          <Feature
            desktop={isDesktop}
            title="Tüm kiralar tek ekranda."
            desc="Yaklaşan ve geciken ödemeleri anında görün; tahsilatı tek dokunuşla kaydedin, kalan borcu ve ödeme geçmişini takip edin."
            icon={Wallet}
            points={['Yaklaşan ve geciken ödemeler', 'Tahsilat kaydı ve ödeme geçmişi', 'Kalan borç / cari hesap takibi', 'Ödeme günü ve gecikme hatırlatmaları']}
            mock={<TrackMock />}
          />
          <Feature
            desktop={isDesktop}
            reverse
            tint
            title="Sözleşmeler artık kontrolünüz altında."
            desc="Kiracı ve mülk bilgileri, başlangıç-bitiş tarihleri, kira bedeli, komisyon ve sözleşme durumu tek yerde. Sözleşme PDF'ini yükleyin, saklayın."
            icon={FileText}
            points={['Başlangıç / bitiş tarihi ve durum', 'Kira bedeli, aidat ve komisyon', 'Kiracı ve mülk sahibi bilgileri', 'Sözleşme PDF yükleme']}
            mock={<ContractMock />}
          />
          <Feature
            desktop={isDesktop}
            title="Portföyünüzün tamamını yönetin."
            desc="Binalar ve daireler, dolu/boş durumu, daire envanteri ve bina bazlı gelir ile doluluk oranları — portföyünüz bir bakışta."
            icon={Building2}
            points={['Bina ve daire envanteri', 'Dolu / boş daire takibi', 'Bina bazlı aylık gelir', 'Doluluk oranları']}
            mock={<PropertyMock />}
          />
          <Feature
            desktop={isDesktop}
            reverse
            tint
            title="Portföyünüzü rakamlarla görün."
            desc="Tahsilat oranı, portföy doluluğu, bina bazlı dağılım ve aylık tahsilat trendi ile portföyünüzün nabzını tutun."
            icon={Sparkles}
            points={['Tahsilat oranı ve kalan alacak', 'Portföy doluluk oranı', 'Bina bazlı gelir dağılımı', 'Aylık tahsilat trendi']}
            mock={<StatsMock />}
          />
          <Feature
            desktop={isDesktop}
            title="Kiracı bilgilerini link ile toplayın."
            desc="Kiracı adayına güvenli bir form linki gönderin; kişisel ve iletişim bilgileri, gelir, araç/plaka, evde yaşayacaklar ve acil durum kişisini kendisi doldursun."
            icon={ClipboardList}
            points={['Kişisel ve iletişim bilgileri', 'Gelir ve araç / plaka', 'Evde yaşayacak kişiler', 'Acil durum kişisi ve danışman değerlendirmesi']}
            mock={<FormMock />}
          />
        </View>

        {/* ---------- AI ASİSTAN (koyu) ---------- */}
        <View className="w-full items-center bg-neutral-900">
          <View className="w-full max-w-[1160px] px-5 py-16">
            <View className="max-w-[720px]">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                <Sparkles size={20} color="#fff" />
              </View>
              <Text className={`mt-4 font-extrabold tracking-tight text-white ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
                Portföyünüzle konuşun.
              </Text>
              <Text className="mt-3 text-base leading-7 text-neutral-300">
                Kira Asistan, portföyünüzün verilerinden bağlamsal finansal öngörüler üretir; geciken tahsilat,
                yaklaşan vade ve aylık tahsilat oranı gibi içgörüleri ana sayfanıza taşır. AI Asistan, Pro planda
                günlük soru hakkıyla, Business planda gelişmiş olarak sunulur.
              </Text>
            </View>
          </View>
        </View>

        {/* ---------- NASIL ÇALIŞIR ---------- */}
        <Section max={1160} onLayout={onSectionLayout('how')}>
          <View className="py-16">
            <Text className={`text-center font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
              Kira Asistan nasıl çalışır?
            </Text>
            <View className={`mt-10 gap-4 ${isDesktop ? 'flex-row' : ''}`}>
              {[
                { n: '01', t: 'Hesabınızı oluşturun', d: 'Dakikalar içinde ücretsiz hesabınızı açın.' },
                { n: '02', t: 'Mülk ve sözleşmelerinizi ekleyin', d: 'Sözleşmeleri tek tek girin veya Excel’den aktarın.' },
                { n: '03', t: 'Takibi Kira Asistan’a bırakın', d: 'Tahsilat, hatırlatma ve raporları uygulama yönetsin.' },
              ].map((s) => (
                <View key={s.n} className="flex-1 rounded-3xl border border-neutral-200 bg-white p-6">
                  <Text className="text-3xl font-extrabold text-neutral-200">{s.n}</Text>
                  <Text className="mt-3 text-lg font-bold text-neutral-900">{s.t}</Text>
                  <Text className="mt-1.5 text-sm leading-6 text-neutral-500">{s.d}</Text>
                </View>
              ))}
            </View>
          </View>
        </Section>

        {/* ---------- KİMLER İÇİN ---------- */}
        <View className="w-full items-center bg-neutral-50" onLayout={onSectionLayout('who')}>
          <View className="w-full max-w-[1160px] px-5 py-16">
            <Text className={`font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
              Kira Asistan kimler için?
            </Text>
            <View className="mt-8 flex-row flex-wrap gap-3">
              {['Mülk Sahipleri', 'Gayrimenkul Yatırımcıları', 'Gayrimenkul Ofisleri', 'Rezidans Yöneticileri', 'Profesyonel Portföy Yöneticileri'].map((w) => (
                <View key={w} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
                  <Text className="text-base font-semibold text-neutral-800">{w}</Text>
                </View>
              ))}
            </View>

            {/* Ekip / çoklu kullanıcı */}
            <View className={`mt-10 rounded-3xl border border-neutral-200 bg-white p-8 ${isDesktop ? 'flex-row items-center gap-8' : ''}`}>
              <View className="flex-1">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-50">
                  <Users size={20} color="#2563EB" />
                </View>
                <Text className="mt-3 text-2xl font-bold text-neutral-900">Ekibinizle birlikte yönetin.</Text>
                <Text className="mt-2 text-sm leading-6 text-neutral-500">
                  Business planında ekibinize kullanıcı ekleyin; yönetici ve personel rolleriyle yetkileri belirleyin,
                  tahsilatı birlikte takip edin.
                </Text>
              </View>
              <View className="mt-5 flex-row gap-2 md:mt-0">
                {['Yönetici', 'Personel', 'Ekip'].map((r) => (
                  <View key={r} className="rounded-xl bg-neutral-100 px-4 py-2">
                    <Text className="text-sm font-semibold text-neutral-700">{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* ---------- MOBİL ---------- */}
        <Section max={1160}>
          <View className={`py-16 ${isDesktop ? 'flex-row items-center gap-12' : 'gap-8'}`}>
            <View className="flex-1">
              <Text className={`font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
                Kira Asistan her zaman yanınızda.
              </Text>
              <Text className="mt-3 text-base leading-7 text-neutral-500">
                Kira Asistan bir web uygulamasıdır; telefonunuzun tarayıcısından açıp ana ekranınıza
                ekleyerek uygulama gibi kullanabilirsiniz. İnternet olan her yerden portföyünüze erişin.
              </Text>
              {(APP_STORE_URL || GOOGLE_PLAY_URL) ? (
                <View className="mt-6 flex-row gap-3">
                  {APP_STORE_URL ? (
                    <Pressable onPress={() => Linking.openURL(APP_STORE_URL)} className="rounded-xl bg-neutral-900 px-5 py-3">
                      <Text className="text-sm font-semibold text-white">App Store</Text>
                    </Pressable>
                  ) : null}
                  {GOOGLE_PLAY_URL ? (
                    <Pressable onPress={() => Linking.openURL(GOOGLE_PLAY_URL)} className="rounded-xl bg-neutral-900 px-5 py-3">
                      <Text className="text-sm font-semibold text-white">Google Play</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <Pressable onPress={goRegister} className="mt-6 self-start rounded-2xl bg-neutral-900 px-6 py-3.5">
                  <Text className="text-base font-semibold text-white">Tarayıcıdan Başla</Text>
                </Pressable>
              )}
            </View>
            <View className={isDesktop ? '' : 'items-center'}>
              <PhoneMock />
            </View>
          </View>
        </Section>

        {/* ---------- PLANLAR ---------- */}
        <View className="w-full items-center bg-neutral-50" onLayout={onSectionLayout('pricing')}>
          <View className="w-full max-w-[1160px] px-5 py-16">
            <Text className={`text-center font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
              İhtiyacınıza uygun planı seçin.
            </Text>
            <Text className="mt-2 text-center text-sm text-neutral-500">Ücretsiz başlayın; dilediğinizde uygulama içinden yükseltin.</Text>
            <View className={`mt-10 gap-4 ${isDesktop ? 'flex-row items-stretch' : ''}`}>
              {(['free', 'pro', 'business'] as const).map((id) => (
                <PlanCard key={id} id={id} onStart={goRegister} desktop={isDesktop} />
              ))}
            </View>
            <Text className="mt-4 text-center text-xs text-neutral-400">Ücretli planlar yıllık faturalandırılır.</Text>
          </View>
        </View>

        {/* ---------- SSS ---------- */}
        <Section max={860} onLayout={onSectionLayout('faq')}>
          <View className="py-16">
            <Text className={`text-center font-extrabold tracking-tight text-neutral-900 ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
              Sık Sorulan Sorular
            </Text>
            <View className="mt-8 gap-3">
              {FAQ.map((f) => (
                <Accordion key={f.q} q={f.q} a={f.a} />
              ))}
            </View>
          </View>
        </Section>

        {/* ---------- FINAL CTA ---------- */}
        <Section max={1160}>
          <View className="pb-16">
            <View className="items-center rounded-[32px] bg-neutral-900 px-6 py-16">
              <Text className={`text-center font-extrabold tracking-tight text-white ${isDesktop ? 'text-4xl' : 'text-3xl'}`}>
                Kira takibini bugün kolaylaştırın.
              </Text>
              <Text className="mt-3 text-center text-base text-neutral-300">İlk sözleşmenizi dakikalar içinde oluşturun.</Text>
              <Pressable onPress={goRegister} className="mt-7 rounded-2xl bg-white px-7 py-4 active:opacity-90">
                <Text className="text-base font-bold text-neutral-900">Ücretsiz Başla</Text>
              </Pressable>
            </View>
          </View>
        </Section>

        {/* ---------- FOOTER ---------- */}
        <View className="w-full items-center border-t border-neutral-200 bg-white">
          <View className="w-full max-w-[1160px] px-5 py-12">
            <View className={isDesktop ? 'flex-row justify-between' : 'gap-8'}>
              <View className="max-w-[280px]">
                <View className="flex-row items-center gap-2">
                  <Image source={require('../../../assets/icon.png')} style={{ width: 26, height: 26, borderRadius: 7 }} />
                  <Text className="text-base font-extrabold text-neutral-900">Kira Asistan</Text>
                </View>
                <Text className="mt-2 text-sm text-neutral-500">Kira takibinden fazlası.</Text>
              </View>
              <View className={isDesktop ? 'flex-row gap-16' : 'flex-row flex-wrap gap-10'}>
                <FooterCol title="Ürün" links={[{ label: 'Özellikler', on: () => scrollTo('features') }, { label: 'Fiyatlandırma', on: () => scrollTo('pricing') }, { label: 'Nasıl Çalışır?', on: () => scrollTo('how') }]} />
                <FooterCol title="Hesap" links={[{ label: 'Giriş Yap', on: goLogin }, { label: 'Kayıt Ol', on: goRegister }]} />
                <FooterCol title="Yasal" links={LEGAL_LINKS.map((l) => ({ label: l.title, on: () => router.push(`/yasal/${l.slug}` as never) }))} />
              </View>
            </View>
            <View className="mt-10 flex-row flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-6">
              <Text className="text-xs text-neutral-400">© {new Date().getFullYear()} Kira Asistan</Text>
              <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
                <Text className="text-xs font-medium text-neutral-500">{SUPPORT_EMAIL}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================ helpers ============================

function Section({ children, max, onLayout }: { children: React.ReactNode; max: number; onLayout?: (e: LayoutChangeEvent) => void }) {
  return (
    <View className="w-full items-center bg-white" onLayout={onLayout}>
      <View className="w-full px-5" style={{ maxWidth: max }}>{children}</View>
    </View>
  );
}

function Feature({
  title,
  desc,
  points,
  icon: Icon,
  mock,
  reverse,
  tint,
  desktop,
}: {
  title: string;
  desc: string;
  points: string[];
  icon: typeof Wallet;
  mock: React.ReactNode;
  reverse?: boolean;
  tint?: boolean;
  desktop: boolean;
}) {
  return (
    <View className={`w-full items-center ${tint ? 'bg-neutral-50' : 'bg-white'}`}>
      <View className="w-full max-w-[1160px] px-5 py-14">
        <View className={desktop ? `flex-row items-center gap-12 ${reverse ? 'flex-row-reverse' : ''}` : 'gap-8'}>
          <View className="flex-1">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary-50">
              <Icon size={20} color="#2563EB" />
            </View>
            <Text className={`mt-4 font-extrabold tracking-tight text-neutral-900 ${desktop ? 'text-3xl' : 'text-2xl'}`}>{title}</Text>
            <Text className="mt-3 text-base leading-7 text-neutral-500">{desc}</Text>
            <View className="mt-5 gap-2.5">
              {points.map((p) => (
                <View key={p} className="flex-row items-center gap-2.5">
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-primary-50">
                    <Check size={12} color="#2563EB" />
                  </View>
                  <Text className="text-sm font-medium text-neutral-700">{p}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="flex-1">{mock}</View>
        </View>
      </View>
    </View>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} className="rounded-2xl border border-neutral-200 bg-white px-5 py-4">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-semibold text-neutral-900">{q}</Text>
        <ChevronDown size={18} color="#666" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </View>
      {open ? <Text className="mt-2.5 text-sm leading-6 text-neutral-500">{a}</Text> : null}
    </Pressable>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; on: () => void }[] }) {
  return (
    <View className="gap-2.5">
      <Text className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</Text>
      {links.map((l) => (
        <Pressable key={l.label} onPress={l.on}>
          <Text className="text-sm font-medium text-neutral-600">{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function PlanCard({ id, onStart, desktop }: { id: 'free' | 'pro' | 'business'; onStart: () => void; desktop: boolean }) {
  const p = PLANS[id];
  const rec = !!p.recommended;
  return (
    <View
      className={`flex-1 rounded-3xl border p-6 ${rec ? 'border-neutral-900 bg-white' : 'border-neutral-200 bg-white'}`}
      style={desktop ? undefined : { marginBottom: 4 }}
    >
      {rec ? (
        <View className="mb-2 self-start rounded-full bg-neutral-900 px-2.5 py-0.5">
          <Text className="text-[11px] font-bold text-white">Önerilen</Text>
        </View>
      ) : null}
      <Text className="text-lg font-extrabold text-neutral-900">{p.name}</Text>
      <Text className="mt-0.5 text-xs text-neutral-500">{p.tagline}</Text>
      <View className="mt-4 h-12 justify-center">
        {p.price ? (
          <View className="flex-row items-end gap-1">
            <Text className="text-3xl font-extrabold text-neutral-900">₺{FMT.format(p.price.monthlyEquivalent)}</Text>
            <Text className="pb-1 text-xs text-neutral-500">/ay eşdeğeri</Text>
          </View>
        ) : (
          <Text className="text-3xl font-extrabold text-neutral-900">Ücretsiz</Text>
        )}
      </View>
      {p.price ? (
        <Text className="text-[11px] text-neutral-400">₺{FMT.format(p.price.yearly)} / yıl</Text>
      ) : (
        <Text className="text-[11px] text-neutral-400">Kredi kartı gerekmez</Text>
      )}
      <Pressable onPress={onStart} className={`mt-4 items-center rounded-2xl py-3 ${rec ? 'bg-neutral-900' : 'border border-neutral-300'}`}>
        <Text className={`text-sm font-semibold ${rec ? 'text-white' : 'text-neutral-800'}`}>{id === 'free' ? 'Hemen Başla' : 'Ücretsiz Başla'}</Text>
      </Pressable>
      <View className="mt-5 gap-2">
        {p.features.map((f) => (
          <View key={f} className="flex-row items-start gap-2">
            <Check size={14} color="#2563EB" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-sm text-neutral-600">{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ---- mockups (nötr, gerçek kişisel veri yok) ----

function MockCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      className="rounded-3xl border border-neutral-200 bg-white p-4"
      style={{ shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }}
    >
      {children}
    </View>
  );
}

function HeroMockup() {
  return (
    <MockCard>
      <View className="rounded-3xl bg-primary p-5">
        <Text className="text-xs font-medium text-white/80">Bu Ay Tahsilat</Text>
        <Text className="mt-1 text-3xl font-extrabold text-white">₺—</Text>
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <View className="h-2 w-2/3 rounded-full bg-white" />
        </View>
      </View>
      <View className="mt-3 gap-2">
        {['Yaklaşan ödeme', 'Geciken ödeme'].map((t, i) => (
          <View key={t} className="flex-row items-center gap-3 rounded-2xl border border-neutral-100 bg-white px-3 py-2.5">
            <View className={`h-9 w-9 rounded-xl ${i === 0 ? 'bg-primary-50' : 'bg-danger-soft'}`} />
            <View className="flex-1">
              <Text className="text-sm font-bold text-neutral-800">{t}</Text>
              <Text className="text-xs text-neutral-400">Daire · Blok</Text>
            </View>
            <Bell size={16} color="#9ca3af" />
          </View>
        ))}
      </View>
    </MockCard>
  );
}

function TrackMock() {
  return (
    <MockCard>
      {['Bu ay', 'Geciken', 'Bu hafta'].map((t, i) => (
        <View key={t} className={`flex-row items-center justify-between py-2.5 ${i > 0 ? 'border-t border-neutral-100' : ''}`}>
          <Text className="text-sm font-medium text-neutral-600">{t}</Text>
          <View className={`h-6 w-16 rounded-lg ${i === 1 ? 'bg-danger-soft' : 'bg-neutral-100'}`} />
        </View>
      ))}
    </MockCard>
  );
}

function ContractMock() {
  return (
    <MockCard>
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 rounded-2xl bg-primary-50" />
        <View className="flex-1 gap-1.5">
          <View className="h-3 w-2/3 rounded bg-neutral-200" />
          <View className="h-2.5 w-1/2 rounded bg-neutral-100" />
        </View>
        <View className="rounded-full bg-success-soft px-2.5 py-1"><Text className="text-[11px] font-bold text-success">Aktif</Text></View>
      </View>
      <View className="mt-3 gap-2 border-t border-neutral-100 pt-3">
        {['Başlangıç / Bitiş', 'Kira bedeli', 'Komisyon'].map((t) => (
          <View key={t} className="flex-row justify-between">
            <Text className="text-xs text-neutral-400">{t}</Text>
            <View className="h-2.5 w-16 rounded bg-neutral-100" />
          </View>
        ))}
      </View>
    </MockCard>
  );
}

function PropertyMock() {
  return (
    <MockCard>
      <View className="flex-row flex-wrap gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <View key={i} className={`h-10 flex-1 rounded-lg ${i % 4 === 0 ? 'bg-neutral-100' : 'bg-success-soft'}`} style={{ minWidth: 40 }} />
        ))}
      </View>
      <View className="mt-3 flex-row justify-between">
        <Text className="text-xs text-neutral-400">Doluluk</Text>
        <Text className="text-xs font-bold text-success">%—</Text>
      </View>
    </MockCard>
  );
}

function StatsMock() {
  const bars = [40, 65, 50, 80, 60, 90];
  return (
    <MockCard>
      <View className="h-32 flex-row items-end justify-between gap-2">
        {bars.map((h, i) => (
          <View key={i} className={`flex-1 rounded-t-lg ${i === bars.length - 1 ? 'bg-primary' : 'bg-primary-50'}`} style={{ height: `${h}%` }} />
        ))}
      </View>
      <Text className="mt-3 text-xs text-neutral-400">Aylık tahsilat trendi (örnek görünüm)</Text>
    </MockCard>
  );
}

function FormMock() {
  return (
    <MockCard>
      {['Ad Soyad', 'Telefon', 'Gelir', 'Araç / Plaka'].map((t) => (
        <View key={t} className="mb-2 gap-1.5">
          <Text className="text-[11px] font-medium text-neutral-400">{t}</Text>
          <View className="h-9 rounded-xl border border-neutral-200 bg-neutral-50" />
        </View>
      ))}
    </MockCard>
  );
}

function PhoneMock() {
  return (
    <View
      className="rounded-[34px] border-4 border-neutral-900 bg-white p-3"
      style={{ width: 220, shadowColor: '#0f172a', shadowOpacity: 0.12, shadowRadius: 30, shadowOffset: { width: 0, height: 16 } }}
    >
      <View className="rounded-2xl bg-primary p-4">
        <Text className="text-[10px] font-medium text-white/80">Bu Ay Tahsilat</Text>
        <Text className="mt-1 text-2xl font-extrabold text-white">₺—</Text>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"><View className="h-1.5 w-3/4 rounded-full bg-white" /></View>
      </View>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} className="mt-2 flex-row items-center gap-2 rounded-xl border border-neutral-100 px-2.5 py-2">
          <View className="h-7 w-7 rounded-lg bg-primary-50" />
          <View className="flex-1 gap-1"><View className="h-2 w-2/3 rounded bg-neutral-200" /><View className="h-1.5 w-1/2 rounded bg-neutral-100" /></View>
        </View>
      ))}
    </View>
  );
}

const FAQ = [
  { q: 'Kira Asistan ücretsiz mi?', a: 'Evet, Free planla ücretsiz başlayabilirsiniz. Free planda en fazla 3 aktif sözleşme yönetebilirsiniz; daha fazlası için Pro veya Business planına geçebilirsiniz.' },
  { q: 'Kaç sözleşme ekleyebilirim?', a: 'Free planda 3, Pro planda 99 aktif sözleşme; Business planında ise sınırsız sözleşme ekleyebilirsiniz.' },
  { q: 'Excel dosyamı aktarabilir miyim?', a: 'Evet. Pro ve Business planlarında Excel dosyanızdan sözleşmelerinizi topluca içeri aktarabilirsiniz.' },
  { q: 'Ekibime kullanıcı ekleyebilir miyim?', a: 'Business planında 5 kullanıcıya kadar ekip yönetimi vardır; yönetici ve personel rolleriyle yetkileri belirleyebilirsiniz.' },
  { q: 'Kiracının hesap açması gerekiyor mu?', a: 'Hayır. Kiracınız, gönderdiğiniz güvenli link ile giriş yapmadan ödeme durumunu görüntüleyebilir ve ödeme bildirimi yapabilir.' },
  { q: 'Telefonumdan kullanabilir miyim?', a: 'Evet. Kira Asistan bir web uygulamasıdır; telefonunuzun tarayıcısından açıp ana ekranınıza ekleyerek uygulama gibi kullanabilirsiniz.' },
  { q: 'Verilerim nasıl korunuyor?', a: 'Verileriniz Supabase altyapısında, satır bazlı erişim kuralları (RLS) ile yalnızca sizin şirketinize özel olarak saklanır; başka şirketler verilerinize erişemez.' },
];
