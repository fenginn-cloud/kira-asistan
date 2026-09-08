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
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Menu,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { PLANS } from '@/features/subscription/plans';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '@/content/legal';
import { GOOGLE_PLAY_URL } from './config';

const NAV = [
  { key: 'features', label: 'Özellikler' },
  { key: 'how', label: 'Nasıl Çalışır?' },
  { key: 'who', label: 'Kimler İçin?' },
  { key: 'pricing', label: 'Fiyatlandırma' },
  { key: 'faq', label: 'SSS' },
] as const;

const FMT = new Intl.NumberFormat('tr-TR');
const web = (o: object) => o as never; // web-only style (RN tip uyumu)
const rw = (o: object) => o as { [k: string]: unknown }; // dataSet vb. web props

const CSS = `
[data-reveal]{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.16,1,.3,1),transform .7s cubic-bezier(.16,1,.3,1)}
[data-reveal].ka-in{opacity:1;transform:none}
@keyframes ka-pulse{0%,100%{opacity:1}50%{opacity:.3}}
[data-pulse]{animation:ka-pulse 1.6s ease-in-out infinite}
@keyframes ka-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
[data-float]{animation:ka-float 5s ease-in-out infinite}
[data-float2]{animation:ka-float 6s ease-in-out infinite .8s}
[data-cta]{transition:transform .18s ease,box-shadow .25s ease,background-color .2s ease}
[data-cta]:hover{transform:translateY(-2px)}
[data-nav]{transition:color .18s ease}
[data-lift]{transition:transform .25s ease,box-shadow .25s ease}
[data-lift]:hover{transform:translateY(-4px)}
::-webkit-scrollbar{width:9px;height:9px}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:6px}
`;

export function LandingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Record<string, number>>({});
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Kira Asistan | Kira ve Mülk Yönetimi';
    document.documentElement.classList.add('landing-web');
    const style = document.createElement('style');
    style.id = 'ka-landing-css';
    style.textContent = CSS;
    if (!document.getElementById('ka-landing-css')) document.head.appendChild(style);
    // Scroll'da fade-up
    const io = new IntersectionObserver(
      (ents) => ents.forEach((e) => e.isIntersecting && e.target.classList.add('ka-in')),
      { threshold: 0.12 }
    );
    const t = setTimeout(() => document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el)), 60);
    return () => {
      clearTimeout(t);
      io.disconnect();
      document.documentElement.classList.remove('landing-web');
      document.getElementById('ka-landing-css')?.remove();
    };
  }, []);

  const scrollTo = (key: string) => {
    setMenuOpen(false);
    scrollRef.current?.scrollTo({ y: Math.max(0, (offsets.current[key] ?? 0) - 12), animated: true });
  };
  const onSectionLayout = (key: string) => (e: LayoutChangeEvent) => {
    offsets.current[key] = e.nativeEvent.layout.y;
  };
  const goRegister = () => router.push('/(auth)/register');
  const goLogin = () => router.push('/(auth)/login');
  const goApp = () => router.push('/(app)/(tabs)');

  return (
    <View className="flex-1 bg-white">
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* ---------- HEADER (sticky) ---------- */}
        <View style={web({ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' })} className="w-full items-center border-b border-slate-200/70 bg-white/85">
          <View className="w-full max-w-[1200px] flex-row items-center justify-between px-5" style={{ height: 72 }}>
            <Pressable onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })} className="flex-row items-center gap-2.5">
              <Image source={require('../../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
              <View>
                <Text className="text-lg font-extrabold leading-5 tracking-tight text-slate-900">Kira Asistan</Text>
                <Text className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Kira & Mülk Yönetimi</Text>
              </View>
            </Pressable>

            {isDesktop ? (
              <View className="flex-row items-center gap-8">
                {NAV.map((n) => (
                  <Pressable key={n.key} onPress={() => scrollTo(n.key)} {...rw({ dataSet: { nav: '' } })}>
                    <Text className="text-sm font-medium text-slate-600">{n.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View className="flex-row items-center gap-2">
              {user ? (
                <Pressable onPress={goApp} {...rw({ dataSet: { cta: '' } })} className="flex-row items-center gap-1.5 rounded-full bg-black px-5 py-2.5">
                  <Text className="text-sm font-semibold text-white">Uygulamaya Git</Text>
                  <ArrowRight size={15} color="#fff" />
                </Pressable>
              ) : isDesktop ? (
                <>
                  <Pressable onPress={goLogin} className="px-3 py-2">
                    <Text className="text-sm font-semibold text-slate-700">Giriş Yap</Text>
                  </Pressable>
                  <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="rounded-full bg-black px-5 py-2.5" style={{ boxShadow: '0 8px 20px rgba(0,0,0,.18)' } as never}>
                    <Text className="text-sm font-semibold text-white">Kayıt Ol</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={() => setMenuOpen((v) => !v)} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200">
                  {menuOpen ? <X size={20} color="#0f172a" /> : <Menu size={20} color="#0f172a" />}
                </Pressable>
              )}
            </View>
          </View>

          {!isDesktop && menuOpen ? (
            <View className="w-full max-w-[1200px] gap-1 border-t border-slate-200 bg-white px-5 py-3">
              {NAV.map((n) => (
                <Pressable key={n.key} onPress={() => scrollTo(n.key)} className="py-2.5">
                  <Text className="text-base font-medium text-slate-700">{n.label}</Text>
                </Pressable>
              ))}
              <View className="mt-2 flex-row gap-2">
                <Pressable onPress={goLogin} className="flex-1 items-center rounded-full border border-slate-200 py-3">
                  <Text className="text-sm font-semibold text-slate-800">Giriş Yap</Text>
                </Pressable>
                <Pressable onPress={goRegister} className="flex-1 items-center rounded-full bg-black py-3">
                  <Text className="text-sm font-semibold text-white">Kayıt Ol</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* ---------- HERO ---------- */}
        <View className="w-full items-center overflow-hidden bg-white">
          <View className="w-full max-w-[1200px] px-5">
            <View className={isDesktop ? 'flex-row items-center gap-6 pb-28 pt-20' : 'gap-14 pb-16 pt-12'}>
              {/* Sol */}
              <View className={isDesktop ? 'flex-1' : ''} {...rw({ dataSet: { reveal: '' } })}>
                <View className="flex-row items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-500" {...rw({ dataSet: { pulse: '' } })} />
                  <Text className="text-xs font-semibold text-slate-700">Kira takibinden fazlası</Text>
                </View>
                <Text
                  className="mt-6 font-extrabold tracking-tight text-black"
                  style={{ fontSize: isDesktop ? 62 : 40, lineHeight: isDesktop ? 66 : 44, letterSpacing: -1 }}
                >
                  Kira yönetiminin{'\n'}daha akıllı yolu.
                </Text>
                <Text className="mt-5 max-w-[520px] text-lg leading-8 text-slate-500">
                  Sözleşmelerinizi, kira ödemelerinizi, kiracılarınızı ve mülklerinizi tek bir yerden yönetin.
                </Text>
                <View className="mt-8 flex-row flex-wrap items-center gap-3">
                  <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="flex-row items-center gap-2 rounded-full bg-black px-8 py-4" style={{ boxShadow: '0 16px 34px rgba(0,0,0,.22)' } as never}>
                    <Text className="text-base font-bold text-white">Ücretsiz Başla</Text>
                    <ArrowRight size={17} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => scrollTo('how')} {...rw({ dataSet: { cta: '' } })} className="rounded-full border border-slate-300 bg-white px-8 py-4">
                    <Text className="text-base font-semibold text-slate-900">Nasıl Çalışır?</Text>
                  </Pressable>
                </View>
                <View className="mt-6 flex-row items-center gap-2">
                  <Check size={16} color="#059669" />
                  <Text className="text-sm font-medium text-slate-500">Kredi kartı gerekmez · Dakikalar içinde başlayın</Text>
                </View>
              </View>

              {/* Sağ — telefon mockup + blob + floating kartlar */}
              <View className={isDesktop ? 'flex-1 items-center' : 'items-center'} {...rw({ dataSet: { reveal: '' } })}>
                <View className="relative items-center justify-center" style={{ width: 360, height: isDesktop ? 640 : 560 }}>
                  <View className="absolute rounded-full bg-primary-50" style={web({ width: 360, height: 360, top: 20, filter: 'blur(60px)' })} />
                  <PhoneFrame />
                  {isDesktop ? (
                    <>
                      <View className="absolute" style={{ top: 60, left: -14 }} {...rw({ dataSet: { float: '' } })}>
                        <FloatChip icon={TrendingUp} tint="emerald" title="Doluluk" value="%94" />
                      </View>
                      <View className="absolute" style={{ top: 150, right: -18 }} {...rw({ dataSet: { float2: '' } })}>
                        <FloatChip icon={Wallet} tint="primary" title="Aylık Gelir" value="₺485.000" />
                      </View>
                      <View className="absolute" style={{ bottom: 70, left: -10 }} {...rw({ dataSet: { float: '' } })}>
                        <FloatChip icon={Check} tint="emerald" title="Tahsil Edilen" value="₺420.000" />
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ---------- BİZİMLE ÇALIŞAN FİRMALAR ---------- */}
        <View className="w-full items-center border-y border-slate-200 bg-slate-50/70">
          <View className="w-full max-w-[1200px] px-5 py-12" {...rw({ dataSet: { reveal: '' } })}>
            <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              Bizimle çalışan firmalar
            </Text>
            <View className="mt-7 flex-row flex-wrap items-center justify-center gap-x-14 gap-y-5">
              {['Re/Max Dream', 'Sarper Gayrimenkul', 'Hece Gayrimenkul', 'Sapanca Realty', 'Kent Portföy'].map((n) => (
                <Text key={n} className="text-xl font-black tracking-tight text-slate-700" style={web({ letterSpacing: -0.4 })}>
                  {n}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* ---------- ÖZELLİKLER ---------- */}
        <View onLayout={onSectionLayout('features')}>
          <Feature
            desktop={isDesktop}
            eyebrow="Kira Takibi"
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
            eyebrow="Sözleşme Yönetimi"
            title="Sözleşmeler artık kontrolünüz altında."
            desc="Kiracı ve mülk bilgileri, başlangıç-bitiş tarihleri, kira bedeli, komisyon ve sözleşme durumu tek yerde. Sözleşme PDF'ini yükleyin, saklayın."
            icon={FileText}
            points={['Başlangıç / bitiş tarihi ve durum', 'Kira bedeli, aidat ve komisyon', 'Kiracı ve mülk sahibi bilgileri', 'Sözleşme PDF yükleme']}
            mock={<ContractMock />}
          />
          <Feature
            desktop={isDesktop}
            eyebrow="Mülk Yönetimi"
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
            eyebrow="İstatistikler"
            title="Portföyünüzü rakamlarla görün."
            desc="Tahsilat oranı, portföy doluluğu, bina bazlı dağılım ve aylık tahsilat trendi ile portföyünüzün nabzını tutun."
            icon={TrendingUp}
            points={['Tahsilat oranı ve kalan alacak', 'Portföy doluluk oranı', 'Bina bazlı gelir dağılımı', 'Aylık tahsilat trendi']}
            mock={<StatsMock />}
          />
          <Feature
            desktop={isDesktop}
            eyebrow="Kiracı Bilgi Formu"
            title="Kiracı bilgilerini link ile toplayın."
            desc="Kiracı adayına güvenli bir form linki gönderin; kişisel ve iletişim bilgileri, gelir, araç/plaka, evde yaşayacaklar ve acil durum kişisini kendisi doldursun."
            icon={ClipboardList}
            points={['Kişisel ve iletişim bilgileri', 'Gelir ve araç / plaka', 'Evde yaşayacak kişiler', 'Acil durum kişisi ve danışman değerlendirmesi']}
            mock={<FormMock />}
          />
        </View>

        {/* ---------- NASIL ÇALIŞIR ---------- */}
        <View className="w-full items-center bg-white" onLayout={onSectionLayout('how')}>
          <View className="w-full max-w-[1200px] px-5 py-24" {...rw({ dataSet: { reveal: '' } })}>
            <SectionHead
              desktop={isDesktop}
              eyebrow="Basit ve Hızlı Süreç"
              title="Kira Asistan nasıl çalışır?"
              sub="Karmaşık kurulum yok. Üç basit adımda profesyonel kira ve mülk yönetimine geçin."
            />
            <View className={`mt-14 gap-6 ${isDesktop ? 'flex-row' : ''}`}>
              {[
                { n: '01', t: 'Hesabınızı oluşturun', d: 'Dakikalar içinde ücretsiz kaydolun; bireysel mülk sahibi veya ofis profilinizi seçin.' },
                { n: '02', t: 'Mülk ve sözleşmelerinizi ekleyin', d: 'Bina ve daireleri girin, kiracıya form linki gönderin veya Excel tablonuzu tek tıkla aktarın.' },
                { n: '03', t: 'Takibi Kira Asistan’a bırakın', d: 'Vadesi gelen kiraları uygulama hatırlatsın; tahsilat, cari hesap ve raporlar hazır olsun.' },
              ].map((s) => (
                <View key={s.n} {...rw({ dataSet: { lift: '' } })} className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-8">
                  <Text className="text-5xl font-black text-slate-300">{s.n}</Text>
                  <Text className="mt-6 text-xl font-bold text-slate-900">{s.t}</Text>
                  <Text className="mt-3 text-sm leading-6 text-slate-500">{s.d}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ---------- KİMLER İÇİN ---------- */}
        <View className="w-full items-center border-y border-slate-200 bg-slate-50/70" onLayout={onSectionLayout('who')}>
          <View className="w-full max-w-[1200px] px-5 py-24" {...rw({ dataSet: { reveal: '' } })}>
            <SectionHead
              desktop={isDesktop}
              eyebrow="Hedef Odaklı Çözümler"
              title="Kira Asistan kimler için?"
              sub="Tek bir dairesi olandan yüzlerce bağımsız bölüm yöneten kurumsal şirketlere kadar herkes için ölçeklenebilir altyapı."
            />
            <View className={`mt-14 gap-6 ${isDesktop ? 'flex-row' : 'flex-row flex-wrap justify-center'}`}>
              {[
                { n: '01', t: 'Bireysel Mülk Sahipleri', d: '1-5 dairesi olan, kira günlerini unutmak istemeyen ve kiracısıyla profesyonel bağ kurmak isteyenler.' },
                { n: '02', t: 'Gayrimenkul Yatırımcıları', d: 'Birden fazla şehirde ve projede yatırımı bulunan, toplam getiri ve nakit akışını anlık izlemek isteyenler.' },
                { n: '03', t: 'Gayrimenkul Ofisleri', d: 'Müşterilerine kira ve yönetim danışmanlığı sunarak düzenli ek gelir elde eden emlak ofisleri.' },
                { n: '04', t: 'Rezidans & Apart Yönetimleri', d: 'Toplu konut, apartman veya rezidanslarda aidat ve kira döngüsünü aksatmadan yönetmek isteyen idareciler.' },
                { n: '05', t: 'Portföy Yöneticileri', d: 'Aile ofisleri, vakıf ve şirket portföylerini tek merkezi panel üzerinden denetleyen profesyoneller.' },
              ].map((c) => (
                <View
                  key={c.n}
                  {...rw({ dataSet: { lift: '' } })}
                  className="rounded-2xl border border-slate-200 bg-white p-6"
                  style={{ width: isDesktop ? undefined : 300, flex: isDesktop ? 1 : undefined, boxShadow: '0 2px 16px rgba(15,23,42,.05)' } as never}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                    <Text className="text-sm font-black text-slate-900">{c.n}</Text>
                  </View>
                  <Text className="mt-4 text-base font-bold text-slate-900">{c.t}</Text>
                  <Text className="mt-2 text-xs leading-5 text-slate-500">{c.d}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ---------- MOBİL ---------- */}
        <View className="w-full items-center bg-white">
          <View className="w-full max-w-[1200px] px-5 py-24" {...rw({ dataSet: { reveal: '' } })}>
            <View className={isDesktop ? 'flex-row items-center gap-16' : 'gap-10'}>
              <View className="flex-1">
                <View className="flex-row items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Her Zaman Erişilebilir</Text>
                </View>
                <Text className="mt-4 font-extrabold tracking-tight text-slate-900" style={{ fontSize: isDesktop ? 42 : 28, lineHeight: isDesktop ? 48 : 34, letterSpacing: -0.6 }}>
                  Kira Asistan her zaman yanınızda.
                </Text>
                <Text className="mt-4 text-base leading-7 text-slate-500">
                  Portföyünüzü bilgisayardan, tabletten veya cebinizden yönetin. Anlık bildirimlerle
                  ödemeler yattığı an haberdar olun; kira ve sözleşmelerinizi dilediğiniz yerden takip edin.
                </Text>
                {GOOGLE_PLAY_URL ? (
                  <Pressable onPress={() => Linking.openURL(GOOGLE_PLAY_URL)} {...rw({ dataSet: { cta: '' } })} className="mt-7 flex-row items-center gap-3 self-start rounded-2xl bg-black px-5 py-3">
                    <Text className="text-2xl">▶</Text>
                    <View>
                      <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Google Play’den</Text>
                      <Text className="text-sm font-bold text-white">İndirin</Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="mt-7 flex-row items-center gap-2 self-start rounded-full bg-black px-7 py-4" style={{ boxShadow: '0 14px 30px rgba(0,0,0,.2)' } as never}>
                    <Text className="text-base font-bold text-white">Tarayıcıdan Başla</Text>
                    <ArrowRight size={16} color="#fff" />
                  </Pressable>
                )}
                <Text className="mt-3 text-xs text-slate-400">Tarayıcıdan açıp ana ekranınıza ekleyerek uygulama gibi de kullanabilirsiniz.</Text>
              </View>
              <View className={isDesktop ? 'flex-1 flex-row items-center justify-center gap-4' : 'flex-row items-center justify-center gap-3'}>
                <MiniPhone title="Canlı Kira Takibi" tone="plain">
                  <Text className="text-[10px] text-slate-400">Bugün tahsil edilen</Text>
                  <Text className="text-base font-extrabold text-slate-900">₺45.500</Text>
                  <Text className="text-[9px] font-semibold text-emerald-600">2 yeni ödeme geldi</Text>
                </MiniPhone>
                <View style={{ marginTop: 40 }}>
                  <MiniPhone title="Ödeme Hatırlatması" tone="emerald">
                    <Text className="text-[11px] font-bold text-emerald-900">Vade yaklaşıyor</Text>
                    <Text className="mt-1 text-[10px] text-emerald-700">Daire 4 · ödeme gününe 2 gün kaldı</Text>
                  </MiniPhone>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ---------- PLANLAR ---------- */}
        <View className="w-full items-center bg-slate-50" onLayout={onSectionLayout('pricing')}>
          <View className="w-full max-w-[1200px] px-5 py-24" {...rw({ dataSet: { reveal: '' } })}>
            <SectionHead
              desktop={isDesktop}
              eyebrow="Şeffaf Fiyatlandırma"
              title="İhtiyacınıza uygun planı seçin."
              sub="Gizli ücret yok, taahhüt yok. Ücretsiz başlayın; dilediğinizde uygulama içinden yükseltin."
            />
            <View className={`mt-14 gap-6 ${isDesktop ? 'flex-row items-stretch' : ''}`}>
              {(['free', 'pro', 'business'] as const).map((id) => (
                <PlanCard key={id} id={id} onStart={goRegister} desktop={isDesktop} />
              ))}
            </View>
            <Text className="mt-6 text-center text-xs text-slate-400">Ücretli planlar yıllık faturalandırılır.</Text>
          </View>
        </View>

        {/* ---------- SSS ---------- */}
        <View className="w-full items-center bg-white" onLayout={onSectionLayout('faq')}>
          <View className="w-full max-w-[860px] px-5 py-24" {...rw({ dataSet: { reveal: '' } })}>
            <SectionHead
              desktop={isDesktop}
              eyebrow="Merak Edilenler"
              title="Sık Sorulan Sorular"
              sub="Aklınıza takılan soruların yanıtlarına göz atın."
            />
            <View className="mt-12 border-t border-slate-200">
              {FAQ.map((f) => <Accordion key={f.q} q={f.q} a={f.a} />)}
            </View>
          </View>
        </View>

        {/* ---------- FINAL CTA ---------- */}
        <View className="w-full items-center bg-white">
          <View className="w-full max-w-[1200px] px-5 pb-24" {...rw({ dataSet: { reveal: '' } })}>
            <View
              className={`overflow-hidden rounded-[40px] bg-black px-8 py-16 ${isDesktop ? 'flex-row items-center justify-between gap-8' : 'gap-8'}`}
              style={{ boxShadow: '0 30px 60px rgba(2,6,23,.28)' } as never}
            >
              <View className={isDesktop ? 'max-w-[560px]' : ''}>
                <Text className="font-black tracking-tight text-white" style={{ fontSize: isDesktop ? 44 : 28, lineHeight: isDesktop ? 50 : 34, letterSpacing: -0.6 }}>
                  Kira takibini bugün kolaylaştırın.
                </Text>
                <Text className="mt-4 text-base text-slate-400">İlk sözleşmenizi dakikalar içinde oluşturun, kiranızı güvenceye alın.</Text>
              </View>
              <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="flex-row items-center gap-2 self-start rounded-full bg-white px-9 py-4" style={{ boxShadow: '0 14px 30px rgba(255,255,255,.14)' } as never}>
                <Text className="text-base font-extrabold text-black">Ücretsiz Başla</Text>
                <ArrowRight size={17} color="#020617" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ---------- FOOTER ---------- */}
        <View className="w-full items-center border-t border-slate-200 bg-white">
          <View className="w-full max-w-[1200px] px-5 pb-12 pt-16">
            <View className={isDesktop ? 'flex-row justify-between gap-10' : 'gap-10'}>
              <View className="max-w-[360px]">
                <View className="flex-row items-center gap-2.5">
                  <Image source={require('../../../assets/icon.png')} style={{ width: 32, height: 32, borderRadius: 8 }} />
                  <Text className="text-lg font-black tracking-tight text-slate-900">Kira Asistan</Text>
                </View>
                <Text className="mt-4 text-xs leading-5 text-slate-500">
                  Kira takibinden fazlası. Mülk sahipleri, gayrimenkul yatırımcıları ve portföy yöneticileri için
                  kira, sözleşme ve mülk yönetimini tek platformda toplayın.
                </Text>
                <Pressable onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} className="mt-4">
                  <Text className="text-xs text-slate-400">İstanbul, Türkiye • Destek: <Text className="font-medium text-slate-600">{SUPPORT_EMAIL}</Text></Text>
                </Pressable>
              </View>
              <View className={isDesktop ? 'flex-row gap-16' : 'flex-row flex-wrap gap-12'}>
                <FooterCol title="Ürün" links={[{ label: 'Özellikler', on: () => scrollTo('features') }, { label: 'Fiyatlandırma', on: () => scrollTo('pricing') }, { label: 'Nasıl Çalışır?', on: () => scrollTo('how') }, { label: 'Kimler İçin?', on: () => scrollTo('who') }]} />
                <FooterCol title="Hesap" links={[{ label: 'Giriş Yap', on: goLogin }, { label: 'Kayıt Ol', on: goRegister }]} />
                <FooterCol title="Yasal" links={LEGAL_LINKS.map((l) => ({ label: l.title, on: () => router.push(`/yasal/${l.slug}` as never) }))} />
              </View>
            </View>
            <View className="mt-12 flex-row flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-8">
              <Text className="text-xs text-slate-400">© {new Date().getFullYear()} Kira Asistan · Tüm hakları saklıdır.</Text>
              <View className="flex-row items-center gap-6">
                <Text className="text-xs text-slate-500">Türkçe (TR)</Text>
                <View className="flex-row items-center gap-1.5">
                  <View className="h-2 w-2 rounded-full bg-emerald-500" />
                  <Text className="text-xs text-slate-500">Sistem Durumu: Normal</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================ helpers ============================

function Eyebrow({ children, center }: { children: string; center?: boolean }) {
  return (
    <Text className={`text-xs font-bold uppercase tracking-[0.16em] text-primary-700 ${center ? 'text-center' : ''}`}>
      {children}
    </Text>
  );
}

/** Ortalanmış bölüm başlığı: eyebrow + büyük başlık + alt açıklama (Stitch). */
function SectionHead({ eyebrow, title, sub, desktop }: { eyebrow: string; title: string; sub?: string; desktop: boolean }) {
  return (
    <View className="mx-auto max-w-[720px] items-center">
      <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</Text>
      <Text className="mt-3 text-center font-extrabold tracking-tight text-slate-900" style={{ fontSize: desktop ? 44 : 30, lineHeight: desktop ? 50 : 36, letterSpacing: -0.7 }}>
        {title}
      </Text>
      {sub ? <Text className="mt-4 text-center text-base leading-7 text-slate-500">{sub}</Text> : null}
    </View>
  );
}

function Feature({
  eyebrow, title, desc, points, icon: Icon, mock, reverse, tint, desktop,
}: {
  eyebrow: string; title: string; desc: string; points: string[];
  icon: typeof Wallet; mock: React.ReactNode; reverse?: boolean; tint?: boolean; desktop: boolean;
}) {
  return (
    <View className={`w-full items-center ${tint ? 'bg-slate-50' : 'bg-white'}`}>
      <View className="w-full max-w-[1200px] px-5 py-20" {...rw({ dataSet: { reveal: '' } })}>
        <View className={desktop ? `flex-row items-center gap-16 ${reverse ? 'flex-row-reverse' : ''}` : 'gap-10'}>
          <View className="flex-1">
            <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
              <Icon size={22} color="#2563EB" />
            </View>
            <Eyebrow>{eyebrow}</Eyebrow>
            <Text className="mt-2 font-extrabold tracking-tight text-slate-900" style={{ fontSize: desktop ? 34 : 26, letterSpacing: -0.5, lineHeight: desktop ? 40 : 32 }}>{title}</Text>
            <Text className="mt-4 text-base leading-7 text-slate-500">{desc}</Text>
            <View className="mt-6 gap-3">
              {points.map((p) => (
                <View key={p} className="flex-row items-center gap-3">
                  <View className="h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                    <Check size={12} color="#059669" />
                  </View>
                  <Text className="text-sm font-medium text-slate-700">{p}</Text>
                </View>
              ))}
            </View>
          </View>
          <View className="flex-1 items-center">{mock}</View>
        </View>
      </View>
    </View>
  );
}

function Accordion({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable onPress={() => setOpen((v) => !v)} className="border-b border-slate-200 py-5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-base font-bold text-slate-900">{q}</Text>
        <ChevronDown size={20} color="#64748b" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </View>
      {open ? <Text className="mt-3 text-sm leading-6 text-slate-500">{a}</Text> : null}
    </Pressable>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; on: () => void }[] }) {
  return (
    <View className="gap-2.5">
      <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</Text>
      {links.map((l) => (
        <Pressable key={l.label} onPress={l.on}>
          <Text className="text-sm font-medium text-slate-600">{l.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FloatChip({ icon: Icon, title, value, tint }: { icon: typeof Check; title: string; value: string; tint: 'emerald' | 'primary' }) {
  return (
    <View className="flex-row items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5" style={{ boxShadow: '0 12px 28px rgba(15,23,42,.14)' } as never}>
      <View className={`h-8 w-8 items-center justify-center rounded-xl ${tint === 'emerald' ? 'bg-emerald-100' : 'bg-primary-50'}`}>
        <Icon size={16} color={tint === 'emerald' ? '#059669' : '#2563EB'} />
      </View>
      <View>
        <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{title}</Text>
        <Text className="text-sm font-extrabold text-slate-900">{value}</Text>
      </View>
    </View>
  );
}

function PlanCard({ id, onStart, desktop }: { id: 'free' | 'pro' | 'business'; onStart: () => void; desktop: boolean }) {
  const p = PLANS[id];
  const rec = !!p.recommended;
  const kicker = id === 'free' ? 'Başlangıç' : id === 'pro' ? 'Profesyonel' : 'Kurumsal & Ofis';
  return (
    <View
      {...rw({ dataSet: { lift: '' } })}
      className={`flex-1 rounded-3xl bg-white p-8 ${rec ? 'border-2 border-black' : 'border border-slate-200'}`}
      style={{ boxShadow: rec ? '0 24px 50px rgba(2,6,23,.14)' : '0 2px 18px rgba(15,23,42,.05)', ...(desktop ? { marginTop: rec ? 0 : 14 } : {}) } as never}
    >
      {rec ? (
        <View className="mb-4 self-start rounded-full bg-black px-4 py-1">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-white">En Çok Tercih Edilen</Text>
        </View>
      ) : null}
      <Text className={`text-xs font-bold uppercase tracking-wider ${rec ? 'text-black' : 'text-slate-400'}`}>{kicker}</Text>
      <Text className="mt-2 text-2xl font-black text-slate-900">{p.name}</Text>
      <Text className="mt-1 text-xs text-slate-500">{p.tagline}</Text>
      <View className="mt-6 flex-row items-end gap-1">
        {p.price ? (
          <>
            <Text className="text-4xl font-black text-slate-900">₺{FMT.format(p.price.monthlyEquivalent)}</Text>
            <Text className="pb-1.5 text-sm font-medium text-slate-500">/ay eşdeğeri</Text>
          </>
        ) : (
          <Text className="text-4xl font-black text-slate-900">₺0 <Text className="text-sm font-medium text-slate-500">/ süresiz</Text></Text>
        )}
      </View>
      <Text className="mt-1 text-[11px] text-slate-400">
        {p.price ? `₺${FMT.format(p.price.yearly)} / yıl olarak faturalandırılır` : 'Kredi kartı gerekmez'}
      </Text>
      <View className="mt-6 gap-3 border-t border-slate-100 pt-6">
        {p.features.map((f) => (
          <View key={f} className="flex-row items-start gap-2.5">
            <Check size={15} color="#0f172a" style={{ marginTop: 2 }} />
            <Text className="flex-1 text-xs font-medium text-slate-700">{f}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onStart}
        {...rw({ dataSet: { cta: '' } })}
        className={`mt-8 items-center rounded-full py-3.5 ${rec ? 'bg-black' : 'border border-slate-300 bg-white'}`}
      >
        <Text className={`text-sm font-bold ${rec ? 'text-white' : 'text-slate-900'}`}>{id === 'free' ? 'Hemen Başla' : 'Ücretsiz Başla'}</Text>
      </Pressable>
    </View>
  );
}

// ---- mockups (nötr, gerçek kişisel veri yok) ----

function Panel({ children, className, wide }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <View className={`w-full ${wide ? 'max-w-[520px]' : 'max-w-[420px]'} rounded-[26px] border border-slate-200 bg-white p-5 ${className ?? ''}`} style={{ boxShadow: '0 24px 60px rgba(15,23,42,.10)' } as never}>
      {children}
    </View>
  );
}

function PhoneFrame({ small }: { small?: boolean }) {
  const w = small ? 250 : 300;
  return (
    <View className="rounded-[46px] border-4 border-zinc-800 bg-black p-3" style={{ width: w, boxShadow: '0 40px 80px rgba(2,6,23,.35)' } as never}>
      <View className="overflow-hidden rounded-[36px] bg-white pt-3">
        <View className="mx-auto mb-3 h-4 w-20 rounded-full bg-black" />
        <View className="px-4 pb-5">
          <View className="rounded-3xl bg-primary p-4">
            <Text className="text-[10px] font-medium text-white/80">Bu Ay Tahsilat</Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">₺420.000</Text>
            <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/25"><View className="h-1.5 w-[86%] rounded-full bg-white" /></View>
            <Text className="mt-1.5 text-[9px] font-medium text-white/70">42 / 48 tahsil edildi</Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            {['Tahsilat', 'Sözleşme', 'Form'].map((t, i) => (
              <View key={t} className={`flex-1 items-center rounded-2xl py-2.5 ${i === 0 ? 'bg-primary-50' : 'bg-slate-100'}`}>
                <Text className={`text-[10px] font-bold ${i === 0 ? 'text-primary-700' : 'text-slate-600'}`}>{t}</Text>
              </View>
            ))}
          </View>
          {[
            { n: 'Dream Res. · D8', s: 'Ödendi', amount: '₺26.500', late: false },
            { n: 'Vadi Kule · D12', s: 'Gecikmede', amount: '₺31.000', late: true },
            { n: 'Sky Garden · D4', s: 'Yaklaştı', amount: '₺19.000', late: false },
          ].map((r) => (
            <View key={r.n} className="mt-2.5 flex-row items-center gap-2.5 rounded-2xl border border-slate-100 px-2.5 py-2">
              <View className={`h-8 w-8 rounded-xl ${r.late ? 'bg-danger-soft' : 'bg-primary-50'}`} />
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-800">{r.n}</Text>
                <Text className={`text-[9px] font-medium ${r.late ? 'text-danger' : 'text-slate-400'}`}>{r.s}</Text>
              </View>
              <Text className={`text-[11px] font-extrabold ${r.late ? 'text-danger' : 'text-emerald-600'}`}>{r.amount}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function MiniPhone({ title, tone, children }: { title: string; tone: 'plain' | 'emerald'; children: React.ReactNode }) {
  return (
    <View className="rounded-[32px] border-2 border-zinc-800 bg-black p-2.5" style={{ width: 210, height: 420, boxShadow: '0 30px 60px rgba(2,6,23,.30)' } as never}>
      <View className="h-full w-full overflow-hidden rounded-[24px] bg-white p-3">
        <View className="mx-auto h-3 w-14 rounded-full bg-black" />
        <Text className="mt-3 text-center text-xs font-bold text-slate-900">{title}</Text>
        <View className={`mt-3 rounded-xl border p-2.5 ${tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
          {children}
        </View>
      </View>
    </View>
  );
}

function TrackMock() {
  const rows = [
    { in: 'CE', name: 'Caner Erkin', unit: 'Dream Residence · Daire 8', amount: '₺26.500', st: 'Ödendi', tone: 'emerald' as const },
    { in: 'SK', name: 'Selin Kaya', unit: 'Sky Garden · Daire 4', amount: '₺19.000', st: 'Vadesi yaklaştı', tone: 'amber' as const },
    { in: 'MA', name: 'Murat Aksoy', unit: 'Vadi Kule · Daire 12', amount: '₺31.000', st: '6 gün gecikmede', tone: 'rose' as const },
    { in: 'BT', name: 'Bahar Tan', unit: 'Pera Konutları · Daire 2', amount: '₺22.500', st: 'Ödendi', tone: 'emerald' as const },
  ];
  const dot = { emerald: '#10b981', amber: '#f59e0b', rose: '#f43f5e' };
  const txt = { emerald: 'text-emerald-600', amber: 'text-amber-600', rose: 'text-rose-600' };
  return (
    <Panel wide>
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-4">
        <View>
          <Text className="text-sm font-bold text-slate-900">Kira Tahsilat Tablosu</Text>
          <Text className="text-[11px] text-slate-400">Bu ay güncel durum</Text>
        </View>
        <View className="rounded-full border border-slate-200 bg-white px-3 py-1"><Text className="text-[11px] font-semibold text-slate-600">Örnek görünüm</Text></View>
      </View>
      <View className="mt-1">
        {rows.map((r, i) => (
          <View key={r.in} className={`flex-row items-center justify-between py-3.5 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
            <View className="flex-row items-center gap-3">
              <View className={`h-9 w-9 items-center justify-center rounded-full ${r.tone === 'rose' ? 'bg-rose-100' : 'bg-slate-100'}`}>
                <Text className={`text-[11px] font-bold ${r.tone === 'rose' ? 'text-rose-700' : 'text-slate-600'}`}>{r.in}</Text>
              </View>
              <View>
                <Text className="text-sm font-semibold text-slate-900">{r.name}</Text>
                <Text className="text-[11px] text-slate-400">{r.unit}</Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-sm font-bold text-slate-900">{r.amount}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dot[r.tone] }} />
                <Text className={`text-[11px] font-semibold ${txt[r.tone]}`}>{r.st}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function ContractMock() {
  const meta = [
    { k: 'Başlangıç / Bitiş', v: '01.09.2023 — 01.09.2025' },
    { k: 'Kira bedeli', v: '₺25.000 / ay' },
    { k: 'Depozito', v: '₺50.000' },
    { k: 'Kiracı', v: 'Caner Erkin' },
  ];
  return (
    <Panel wide>
      <View className="flex-row items-center justify-between">
        <View className="rounded-full bg-emerald-100 px-3 py-1"><Text className="text-[11px] font-bold text-emerald-800">Yürürlükte</Text></View>
        <Text className="text-[11px] font-semibold text-slate-400">Dream Residence · A Blok</Text>
      </View>
      <Text className="mt-3 text-lg font-bold text-slate-900">A Blok – Daire 8</Text>
      <View className="mt-1 flex-row items-end gap-1">
        <Text className="text-2xl font-black text-slate-900">₺25.000</Text>
        <Text className="pb-1 text-xs font-medium text-slate-400">/ ay</Text>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-y-3 border-t border-slate-100 pt-4">
        {meta.map((m) => (
          <View key={m.k} style={{ width: '50%' }}>
            <Text className="text-[11px] text-slate-400">{m.k}</Text>
            <Text className="mt-0.5 text-xs font-semibold text-slate-800">{m.v}</Text>
          </View>
        ))}
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3.5">
        <Text className="text-[11px] font-medium text-slate-500">Sözleşme PDF yüklü</Text>
        <Text className="text-[11px] font-bold text-slate-900">PDF’i Gör →</Text>
      </View>
    </Panel>
  );
}

function PropertyMock() {
  const units = [
    { blk: 'A Blok · D:8', name: 'Caner Erkin', rent: '₺26.500 / ay', st: 'DOLU', vacant: false },
    { blk: 'A Blok · D:9', name: 'Derya Demir', rent: '₺28.000 / ay', st: 'DOLU', vacant: false },
    { blk: 'B Blok · D:2', name: 'Kiracı aranıyor', rent: 'Hedef: ₺30.000 / ay', st: 'BOŞ', vacant: true },
    { blk: 'B Blok · D:7', name: 'Emre Yıldız', rent: '₺24.000 / ay', st: 'DOLU', vacant: false },
  ];
  return (
    <Panel wide>
      <View className="flex-row items-center justify-between border-b border-slate-100 pb-4">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold text-slate-900">Dream Residence</Text>
            <View className="rounded-full bg-emerald-100 px-2 py-0.5"><Text className="text-[10px] font-semibold text-emerald-700">Aktif</Text></View>
          </View>
          <Text className="mt-0.5 text-[11px] text-slate-400">48 bağımsız bölüm</Text>
        </View>
        <View className="items-end">
          <Text className="text-[10px] text-slate-400">Doluluk</Text>
          <Text className="text-lg font-black text-slate-900">%98</Text>
        </View>
      </View>
      <View className="mt-4 flex-row flex-wrap gap-3">
        {units.map((u) => (
          <View
            key={u.blk}
            className={`rounded-2xl border p-3.5 ${u.vacant ? 'border-2 border-dashed border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'}`}
            style={{ width: '47%' }}
          >
            <View className="flex-row items-center justify-between">
              <View className="rounded bg-slate-100 px-2 py-0.5"><Text className="text-[10px] font-bold text-slate-600">{u.blk}</Text></View>
              <Text className={`text-[10px] font-bold ${u.vacant ? 'text-slate-500' : 'text-emerald-600'}`}>{u.st}</Text>
            </View>
            <Text className={`mt-3 text-sm font-bold ${u.vacant ? 'text-slate-500' : 'text-slate-900'}`}>{u.name}</Text>
            <Text className="text-[11px] text-slate-400">{u.rent}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

function StatsMock() {
  const kpis = [
    { l: 'Aylık toplam kira', v: '₺485.000', s: '↑ %8.4', danger: false },
    { l: 'Tahsilat oranı', v: '%94', s: '42 tamamlandı', danger: false },
    { l: 'Geciken kiralar', v: '₺35.000', s: '3 takipte', danger: true },
    { l: 'Boş daire', v: '3', s: 'Potansiyel gelir', danger: false },
  ];
  const bars = [60, 65, 68, 72, 78, 80, 86, 90, 95, 100];
  return (
    <Panel wide>
      <View className="flex-row flex-wrap gap-3">
        {kpis.map((k) => (
          <View key={k.l} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3.5" style={{ width: '47%' }}>
            <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k.l}</Text>
            <Text className={`mt-1 text-xl font-black ${k.danger ? 'text-rose-600' : 'text-slate-900'}`}>{k.v}</Text>
            <Text className={`text-[10px] font-medium ${k.danger ? 'text-rose-500' : 'text-emerald-600'}`}>{k.s}</Text>
          </View>
        ))}
      </View>
      <View className="mt-5 rounded-2xl border border-slate-100 p-4">
        <Text className="text-xs font-bold text-slate-800">Aylık tahsilat eğrisi</Text>
        <View className="mt-4 h-28 flex-row items-end justify-between gap-1.5">
          {bars.map((h, i) => (
            <View key={i} className={`flex-1 rounded-t-md ${i === bars.length - 1 ? 'bg-slate-900' : 'bg-slate-200'}`} style={{ height: `${h}%` }} />
          ))}
        </View>
      </View>
    </Panel>
  );
}

function FormMock() {
  const fields = [
    { l: 'Ad Soyad', v: 'Caner Erkin' },
    { l: 'Telefon', v: '0532 *** 45 67' },
    { l: 'Meslek / Gelir', v: 'Yazılım Direktörü' },
    { l: 'Araç / Plaka', v: '34 BJK 1903' },
  ];
  return (
    <Panel wide>
      <View className="flex-row items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
        <View className="h-2 w-2 rounded-full bg-emerald-500" />
        <Text className="text-[11px] font-medium text-slate-500">kiraasist.fngn.com.tr/form</Text>
        <View className="ml-auto rounded bg-emerald-100 px-2 py-0.5"><Text className="text-[9px] font-bold text-emerald-700">SSL</Text></View>
      </View>
      <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        <Text className="text-sm font-bold text-slate-900">Kiracı Bilgi Formu</Text>
        <View className="mt-3 flex-row flex-wrap gap-3">
          {fields.map((f) => (
            <View key={f.l} style={{ width: '47%' }}>
              <Text className="mb-1 text-[10px] font-semibold text-slate-400">{f.l}</Text>
              <View className="rounded-lg border border-slate-200 bg-white px-2.5 py-2">
                <Text className="text-[11px] font-semibold text-slate-800">{f.v}</Text>
              </View>
            </View>
          ))}
        </View>
        <View className="mt-4 items-center rounded-xl bg-slate-900 py-2.5">
          <Text className="text-[11px] font-bold text-white">Bilgiler güvenle gönderildi ✓</Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center gap-2.5 rounded-xl border border-emerald-200 bg-white p-3">
        <View className="h-2 w-2 rounded-full bg-emerald-500" />
        <Text className="flex-1 text-[11px] text-slate-600">
          <Text className="font-bold text-slate-900">Bildirim:</Text> Yeni kiracı formu dolduruldu.
        </Text>
      </View>
    </Panel>
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
