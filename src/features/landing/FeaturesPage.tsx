import { useEffect } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Check,
  ClipboardList,
  FileText,
  Link2,
  Minus,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { PLANS, FEATURE_MATRIX } from '@/features/subscription/plans';
import { LEGAL_LINKS, SUPPORT_EMAIL } from '@/content/legal';
import {
  CSS,
  Eyebrow,
  SectionHead,
  PlanCard,
  FooterCol,
  StoreBadges,
} from './LandingPage';

const rw = (o: object) => o as { [k: string]: unknown };
const web = (o: object) => o as never;

/** Günlük iş akışı anlatısı: ikon + eyebrow + başlık + metin + madde listesi. */
const WORKFLOWS: {
  icon: typeof Wallet;
  eyebrow: string;
  title: string;
  desc: string;
  points: string[];
}[] = [
  {
    icon: Wallet,
    eyebrow: 'Her Sabah',
    title: 'Hangi kira geldi, hangisi gecikti — bir bakışta.',
    desc: 'Güne başlarken kimin ödemesi yaklaşıyor, kim geciktirmiş görürsünüz. Ödeme geldiğinde tek dokunuşla işaretlersiniz; kalan borç ve devreden bakiye kendiliğinden güncellenir.',
    points: [
      'Yaklaşan ve geciken ödemeler ayrı ayrı listelenir',
      'Tahsilatı nakit / havale / kart olarak kaydedersiniz',
      'Ödeme geçmişi ve cari hesap (devreden bakiye) her zaman güncel',
      'Kısmi ödeme girerseniz kalan borç otomatik hesaplanır',
    ],
  },
  {
    icon: FileText,
    eyebrow: 'Sözleşme Bilgisi Aradığınızda',
    title: 'Her sözleşmenin tüm detayı tek kartta.',
    desc: 'Kiracı ve mülk sahibi bilgileri, başlangıç-bitiş tarihi, kira bedeli, aidat, depozito ve giriş komisyonu tek yerde. Sözleşmenin PDF’ini yükleyip saklarsınız; aradığınızı klasör karıştırmadan bulursunuz.',
    points: [
      'Kiracı, mülk sahibi ve iletişim bilgileri',
      'Kira, aidat, depozito ve bir kerelik komisyon',
      'Başlangıç / bitiş tarihi ve sözleşme durumu',
      'Sözleşme PDF’ini yükleyip saklama',
    ],
  },
  {
    icon: Building2,
    eyebrow: 'Portföyü Yönetirken',
    title: 'Binalar, daireler, dolu-boş durumu tek panelde.',
    desc: 'Her binanın dairelerini tanımlarsınız; hangisi dolu, hangisi boş anında görünür. Bina bazlı aylık gelir ve doluluk oranıyla portföyünüzün büyük resmini kaçırmazsınız.',
    points: [
      'Bina ve daire envanteri',
      'Dolu / boş daire takibi',
      'Bina bazlı aylık gelir',
      'Doluluk oranları',
    ],
  },
  {
    icon: ClipboardList,
    eyebrow: 'Yeni Kiracı Alırken',
    title: 'Kiracı bilgisini formla toplayın, elle yazmayın.',
    desc: 'Kiracı adayına güvenli bir form linki gönderirsiniz; kişisel ve iletişim bilgilerini, gelirini, aracını ve acil durum kişisini kendisi doldurur. Bilgiler doğrudan sisteme düşer, siz de değerlendirmenizi eklersiniz.',
    points: [
      'Kişisel, iletişim ve gelir bilgileri',
      'Araç / plaka ve evde yaşayacak kişiler',
      'Acil durum kişisi',
      'Danışman değerlendirme notu',
    ],
  },
  {
    icon: Link2,
    eyebrow: 'Kiracıyla İletişimde',
    title: 'Kiracınız uygulama indirmeden ödeme bildirir.',
    desc: 'Kiracıya gönderdiğiniz link ile kiracınız giriş yapmadan bu ay ne kadar borcu olduğunu görür ve ödeme bildirir. Bildirim size düşer; onayladığınızda tahsilat kaydınıza işlenir.',
    points: [
      'Kiracı için hesap açma / şifre yok',
      'Kalan borcunu link üzerinden görür',
      'Ödeme bildirir, dekont ekler',
      'Siz onaylayınca cari hesaba işlenir',
    ],
  },
  {
    icon: Bell,
    eyebrow: 'Arka Planda',
    title: 'Vadeleri Kira Asistan takip etsin.',
    desc: 'Ödeme günü yaklaşınca 7, 3 ve 1 gün önceden; ödeme günü ve gecikmede otomatik hatırlatma alırsınız. Hangi bildirimlerin gideceğini sözleşme bazında açıp kapatabilirsiniz.',
    points: [
      '7 / 3 / 1 gün önce, ödeme günü ve gecikme hatırlatmaları',
      'Sözleşme bazında bildirim açma / kapatma',
      'Mülk sahibi, kiracı ve ekip için ayrı kanallar',
      'Anlık cihaz bildirimleri',
    ],
  },
  {
    icon: BarChart3,
    eyebrow: 'Ay Sonunda',
    title: 'Rakamlarla nerede olduğunuzu görün.',
    desc: 'Tahsilat oranı, portföy doluluğu, bina bazlı gelir dağılımı ve aylık tahsilat trendi tek ekranda. Mülk bazlı aylık performans raporuyla hangi binanın ne kadar getirdiğini karşılaştırırsınız.',
    points: [
      'Tahsilat oranı ve kalan alacak',
      'Portföy doluluk oranı',
      'Bina bazlı gelir dağılımı',
      'Mülk bazlı aylık performans raporu',
    ],
  },
];

export function FeaturesPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = 'Tüm Özellikler | Kira Asistan';
    document.documentElement.classList.add('landing-web');
    if (!document.getElementById('ka-landing-css')) {
      const style = document.createElement('style');
      style.id = 'ka-landing-css';
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    return () => {
      document.documentElement.classList.remove('landing-web');
    };
  }, []);

  const goRegister = () => router.push('/(auth)/register');
  const goLogin = () => router.push('/(auth)/login');
  const goApp = () => router.push('/(app)/(tabs)');
  const goHome = () => router.push('/');

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[0]}>
        {/* ---------- HEADER ---------- */}
        <View
          style={web({ position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(10px)' })}
          className="w-full items-center border-b border-slate-200/70 bg-white/85"
        >
          <View className="w-full max-w-[1240px] flex-row items-center justify-between px-5" style={{ height: 72 }}>
            <Pressable onPress={goHome} className="flex-row items-center gap-2.5">
              <Image source={require('../../../assets/icon.png')} style={{ width: 36, height: 36, borderRadius: 9 }} />
              <View>
                <Text className="text-lg font-extrabold leading-5 tracking-tight text-slate-900">Kira Asistan</Text>
                <Text className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Kira & Mülk Yönetimi</Text>
              </View>
            </Pressable>

            <View className="flex-row items-center gap-2">
              {isDesktop ? (
                <Pressable onPress={goHome} className="flex-row items-center gap-1.5 px-3 py-2">
                  <ArrowLeft size={15} color="#334155" />
                  <Text className="text-sm font-semibold text-slate-700">Ana Sayfa</Text>
                </Pressable>
              ) : null}
              {user ? (
                <Pressable onPress={goApp} {...rw({ dataSet: { cta: '' } })} className="flex-row items-center gap-1.5 rounded-full bg-black px-5 py-2.5">
                  <Text className="text-sm font-semibold text-white">Uygulamaya Git</Text>
                  <ArrowRight size={15} color="#fff" />
                </Pressable>
              ) : (
                <>
                  <Pressable onPress={goLogin} className="px-3 py-2">
                    <Text className="text-sm font-semibold text-slate-700">Giriş Yap</Text>
                  </Pressable>
                  <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="rounded-full bg-black px-5 py-2.5">
                    <Text className="text-sm font-semibold text-white">Ücretsiz Başla</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ---------- HERO ---------- */}
        <View className="w-full items-center overflow-hidden" style={web({ background: 'linear-gradient(180deg,#e9f1ff 0%,#f4f8ff 42%,#ffffff 100%)' })}>
          <View className="w-full max-w-[860px] items-center px-5 pb-16 pt-14">
            <View className="flex-row items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5">
              <Sparkles size={13} color="#1D4ED8" />
              <Text className="text-xs font-bold text-primary-700">Tüm Özellikler</Text>
            </View>
            <Text
              className="mt-6 text-center font-extrabold tracking-tight text-slate-900"
              style={{ fontSize: isDesktop ? 52 : 34, lineHeight: isDesktop ? 58 : 40, letterSpacing: isDesktop ? -1.2 : -0.8 }}
            >
              Kira Asistan ile{'\n'}neler yapabilirsiniz?
            </Text>
            <Text
              className="mt-5 max-w-[620px] text-center text-slate-500"
              style={{ fontSize: isDesktop ? 18 : 16, lineHeight: isDesktop ? 29 : 25 }}
            >
              Kira Asistan bir özellik listesi değil, günlük işinizin akışı. Aşağıda; kirayı tahsil
              etmekten kiracı almaya, raporlardan ekiple çalışmaya kadar uygulamanın her gün nasıl
              yanınızda olduğunu adım adım anlatıyoruz.
            </Text>
          </View>
        </View>

        {/* ---------- GÜNLÜK AKIŞ ---------- */}
        <View>
          {WORKFLOWS.map((w, i) => (
            <WorkflowBlock key={w.title} {...w} tint={i % 2 === 1} desktop={isDesktop} />
          ))}
        </View>

        {/* ---------- EKİP / BUSINESS ---------- */}
        <TeamSection desktop={isDesktop} width={width} />

        {/* ---------- PLANLAR ---------- */}
        <View className="w-full items-center bg-white">
          <View className="w-full max-w-[1240px] px-5 py-24">
            <SectionHead
              desktop={isDesktop}
              eyebrow="Hangi Plan Size Uygun?"
              title="Her plan farklı bir çalışma şekli için."
              sub="Fiyattan önce şuna bakın: portföyünüzü nasıl yönetiyorsunuz? Doğru plan, ihtiyacınızla başlar."
            />

            <View className={`mt-14 gap-6 ${isDesktop ? 'flex-row' : ''}`}>
              {PLAN_NARRATIVES.map((p) => (
                <View key={p.id} className="flex-1 rounded-3xl border border-slate-200 bg-slate-50 p-7">
                  <Text className="text-xs font-bold uppercase tracking-wider text-primary-700">{p.kicker}</Text>
                  <Text className="mt-2 text-2xl font-black text-slate-900">{PLANS[p.id].name}</Text>
                  <Text className="mt-3 text-sm leading-6 text-slate-600">{p.who}</Text>
                  <View className="mt-4 border-t border-slate-200 pt-4">
                    <Text className="text-sm leading-6 text-slate-500">{p.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Fiyat kartları (gerçek fiyatlar) */}
            <View className={`mt-8 gap-6 ${isDesktop ? 'flex-row items-stretch' : ''}`}>
              {(['free', 'pro', 'business'] as const).map((id) => (
                <PlanCard key={id} id={id} onStart={goRegister} desktop={isDesktop} />
              ))}
            </View>
            <Text className="mt-6 text-center text-xs text-slate-400">Ücretli planlar yıllık faturalandırılır. Gizli ücret ve taahhüt yok.</Text>

            {/* Karşılaştırma tablosu (gerçek matris) */}
            <View className="mt-14">
              <Text className="mb-4 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Ayrıntılı karşılaştırma
              </Text>
              <ComparisonTable />
            </View>
          </View>
        </View>

        {/* ---------- FINAL CTA ---------- */}
        <View className="w-full items-center bg-white">
          <View className="w-full max-w-[1240px] px-5 pb-24">
            <View
              className={`overflow-hidden rounded-[40px] bg-black px-8 py-16 ${isDesktop ? 'flex-row items-center justify-between gap-8' : 'gap-8'}`}
              style={{ boxShadow: '0 30px 60px rgba(2,6,23,.28)' } as never}
            >
              <View className={isDesktop ? 'max-w-[560px]' : ''}>
                <Text className="font-black tracking-tight text-white" style={{ fontSize: isDesktop ? 40 : 26, lineHeight: isDesktop ? 46 : 32, letterSpacing: -0.6 }}>
                  Ücretsiz başlayın, ihtiyaç oldukça büyüyün.
                </Text>
                <Text className="mt-4 text-base text-slate-400">İlk sözleşmenizi dakikalar içinde ekleyin; planınızı dilediğinizde uygulama içinden yükseltin.</Text>
              </View>
              <Pressable onPress={goRegister} {...rw({ dataSet: { cta: '' } })} className="flex-row items-center gap-2 self-start rounded-full bg-white px-9 py-4">
                <Text className="text-base font-extrabold text-black">Ücretsiz Başla</Text>
                <ArrowRight size={17} color="#020617" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ---------- FOOTER ---------- */}
        <View className="w-full items-center border-t border-slate-200 bg-white">
          <View className="w-full max-w-[1240px] px-5 pb-12 pt-16">
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
                <View className="mt-5">
                  <StoreBadges />
                </View>
              </View>
              <View className={isDesktop ? 'flex-row gap-16' : 'flex-row flex-wrap gap-12'}>
                <FooterCol title="Ürün" links={[{ label: 'Ana Sayfa', on: goHome }, { label: 'Giriş Yap', on: goLogin }, { label: 'Kayıt Ol', on: goRegister }]} />
                <FooterCol title="Yasal" links={LEGAL_LINKS.map((l) => ({ label: l.title, on: () => router.push(`/yasal/${l.slug}` as never) }))} />
                <FooterCol title="İletişim" links={[{ label: SUPPORT_EMAIL, on: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}`) }]} />
              </View>
            </View>
            <View className="mt-12 border-t border-slate-100 pt-8">
              <Text className="text-xs text-slate-400">© {new Date().getFullYear()} Kira Asistan · Tüm hakları saklıdır.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================ sections ============================

function WorkflowBlock({
  icon: Icon, eyebrow, title, desc, points, tint, desktop,
}: {
  icon: typeof Wallet; eyebrow: string; title: string; desc: string;
  points: string[]; tint?: boolean; desktop: boolean;
}) {
  return (
    <View className={`w-full items-center ${tint ? 'bg-slate-50' : 'bg-white'}`}>
      <View className="w-full max-w-[880px] px-5 py-16">
        <View className="mb-4 h-11 w-11 items-center justify-center rounded-2xl bg-primary-50">
          <Icon size={22} color="#2563EB" />
        </View>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text className="mt-2 font-extrabold tracking-tight text-slate-900" style={{ fontSize: desktop ? 32 : 25, letterSpacing: -0.5, lineHeight: desktop ? 38 : 31 }}>
          {title}
        </Text>
        <Text className="mt-4 text-base leading-7 text-slate-500">{desc}</Text>
        <View className={`mt-6 gap-3 ${desktop ? 'flex-row flex-wrap' : ''}`}>
          {points.map((p) => (
            <View key={p} className={`flex-row items-center gap-3 ${desktop ? 'w-[calc(50%-8px)]' : ''}`}>
              <View className="h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                <Check size={12} color="#059669" />
              </View>
              <Text className="flex-1 text-sm font-medium text-slate-700">{p}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Business ekip yapısı — gerçek yetkilendirme sistemine göre. */
function TeamSection({ desktop, width }: { desktop: boolean; width: number }) {
  return (
    <View className="w-full items-center border-y border-slate-200 bg-slate-900">
      <View className="w-full max-w-[1080px] px-5 py-24">
        <View className="mx-auto max-w-[720px] items-center">
          <View className="flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <Users size={13} color="#93C5FD" />
            <Text className="text-xs font-bold uppercase tracking-[0.16em] text-primary-200">Business · Ekip</Text>
          </View>
          <Text className="mt-4 text-center font-extrabold tracking-tight text-white" style={{ fontSize: desktop ? 40 : 28, lineHeight: desktop ? 46 : 34, letterSpacing: -0.6 }}>
            Portföyü ekibinizle birlikte yönetin.
          </Text>
          <Text className="mt-4 text-center text-base leading-7 text-slate-400">
            Business planında yönetici, ekibine 5 kişiye kadar kullanıcı ekler. Herkes aynı portföyde
            çalışır ama herkes her şeyi görmez — her çalışan yalnızca kendi işine odaklanır.
          </Text>
        </View>

        {/* İki çalışma rolü */}
        <View className={`mt-14 gap-5 ${desktop ? 'flex-row' : ''}`}>
          <View className="flex-1 rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary/20">
              <UserCog size={22} color="#93C5FD" />
            </View>
            <Text className="mt-4 text-xl font-bold text-white">Yönetici</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-400">
              Ofisin veya firmanın sahibi gibi düşünün. Tüm portföyü görür ve yönetir.
            </Text>
            <View className="mt-5 gap-3">
              {[
                'Tüm sözleşme, tahsilat ve cari hesapları görür',
                'İstatistik ve mülk bazlı raporlara erişir',
                'Ekibe kullanıcı ekler, rolünü belirler',
                'Kullanıcıyı aktif/pasif yapar, son girişini görür',
              ].map((t) => (
                <View key={t} className="flex-row items-start gap-2.5">
                  <View className="mt-0.5 h-4 w-4 items-center justify-center rounded-full bg-primary/25"><Check size={10} color="#BFDBFE" /></View>
                  <Text className="flex-1 text-[13px] leading-5 text-slate-300">{t}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="flex-1 rounded-3xl border border-white/10 bg-white/[0.04] p-7">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20">
              <Users size={22} color="#6EE7B7" />
            </View>
            <Text className="mt-4 text-xl font-bold text-white">Ekip Üyesi (Personel)</Text>
            <Text className="mt-2 text-sm leading-6 text-slate-400">
              Kendi portföyüne bakan danışman gibi. Yalnızca sorumlu olduğu işi görür.
            </Text>
            <View className="mt-5 gap-3">
              {[
                'Yalnızca kendisine atanan sözleşmeleri görür',
                'Bu sözleşmelerin tahsilatını kaydeder, takip eder',
                'Başka danışmanların portföyünü göremez',
                'Cari hesap, istatistik ve yönetim ekranları gizlidir',
              ].map((t) => (
                <View key={t} className="flex-row items-start gap-2.5">
                  <View className="mt-0.5 h-4 w-4 items-center justify-center rounded-full bg-emerald-500/25"><Check size={10} color="#A7F3D0" /></View>
                  <Text className="flex-1 text-[13px] leading-5 text-slate-300">{t}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Nasıl kurulur */}
        <View className={`mt-5 gap-5 ${desktop ? 'flex-row' : ''}`}>
          {[
            { n: '01', t: 'Yönetici ekibi kurar', d: 'Ayarlar → Kullanıcı Yönetimi’nden ad, e-posta ve geçici şifreyle yeni kullanıcı eklenir.' },
            { n: '02', t: 'Sözleşmeler paylaşılır', d: 'Her sözleşme bir ekip üyesine atanır; o üye yalnızca kendi kayıtlarını görür.' },
            { n: '03', t: 'Herkes kendi işine bakar', d: 'Danışmanlar kendi tahsilatını yürütür, yönetici bütün portföyün nabzını tutar.' },
          ].map((s) => (
            <View key={s.n} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <Text className="text-3xl font-black text-white/20">{s.n}</Text>
              <Text className="mt-3 text-base font-bold text-white">{s.t}</Text>
              <Text className="mt-2 text-[13px] leading-5 text-slate-400">{s.d}</Text>
            </View>
          ))}
        </View>

        {/* Güvenlik / izolasyon notu */}
        <View className="mt-8 flex-row items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-xl bg-white/10"><ShieldCheck size={16} color="#6EE7B7" /></View>
          <Text className="flex-1 text-[13px] leading-6 text-slate-300">
            <Text className="font-bold text-white">Veriler birbirine karışmaz. </Text>
            Erişim satır bazlı güvenlik kurallarıyla sunucu tarafında uygulanır: bir ekip üyesi
            yalnızca kendisine atanan kayıtlara erişir, şirketinizin verileri başka şirketlere tamamen kapalıdır.
          </Text>
        </View>

        {/* Kime yarar */}
        <Text
          className="mx-auto mt-10 text-center text-base leading-7 text-slate-400"
          style={{ maxWidth: Math.min(720, width - 40) }}
        >
          Bu yapı özellikle <Text className="font-semibold text-slate-200">emlak ofisleri</Text> ve{' '}
          <Text className="font-semibold text-slate-200">çok sayıda mülk yöneten firmalar</Text> için uygundur:
          her danışman kendi portföyüne odaklanırken yönetici tüm ekibin tahsilatını ve performansını tek panelden görür.
        </Text>
      </View>
    </View>
  );
}

function ComparisonTable() {
  const cell = (v: boolean | string) => {
    if (v === true) return <Check size={15} color="#059669" />;
    if (v === false) return <Minus size={15} color="#cbd5e1" />;
    return <Text className="text-[11px] font-bold text-slate-800">{v}</Text>;
  };
  return (
    <View className="overflow-hidden rounded-3xl border border-slate-200 bg-white" style={{ boxShadow: '0 2px 18px rgba(15,23,42,.05)' } as never}>
      {/* Başlık satırı */}
      <View className="flex-row items-center border-b border-slate-200 bg-slate-50 px-3 py-3">
        <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Özellik</Text>
        {(['Free', 'Pro', 'Business'] as const).map((h) => (
          <Text key={h} className="text-center text-[11px] font-bold text-slate-700" style={{ width: 62 }}>{h}</Text>
        ))}
      </View>
      {FEATURE_MATRIX.map((row, i) => (
        <View key={row.label} className={`flex-row items-center px-3 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
          <Text className="flex-1 pr-2 text-[12px] font-medium text-slate-700">{row.label}</Text>
          <View className="items-center" style={{ width: 62 }}>{cell(row.free)}</View>
          <View className="items-center" style={{ width: 62 }}>{cell(row.pro)}</View>
          <View className="items-center" style={{ width: 62 }}>{cell(row.business)}</View>
        </View>
      ))}
    </View>
  );
}

const PLAN_NARRATIVES: { id: 'free' | 'pro' | 'business'; kicker: string; who: string; body: string }[] = [
  {
    id: 'free',
    kicker: 'Yeni Başlayan',
    who: 'Birkaç dairesi olan ve kira günlerini artık defterde takip etmek istemeyen bireysel mülk sahipleri için.',
    body: 'Üç aktif sözleşmeye kadar kira ve tahsilatınızı, cari hesabınızı ve geciken ödemelerinizi ücretsiz takip edersiniz. Uygulamayı hiçbir ücret ödemeden denemenin en kolay yolu.',
  },
  {
    id: 'pro',
    kicker: 'Portföyünü Büyüten',
    who: 'Portföyünü tek başına yöneten, daire sayısı artmış aktif mülk sahipleri ve yatırımcılar için.',
    body: '30 sözleşmeye kadar; tüm hatırlatmalar, Excel’den toplu aktarım, istatistik ve raporlar, kiracı ödeme portalı ve AI destekli öneriler devreye girer. Tek kişilik ama profesyonel bir kira yönetimi.',
  },
  {
    id: 'business',
    kicker: 'Ekiple Yöneten',
    who: 'Emlak ofisleri, portföy yöneticileri ve çok sayıda mülk yöneten firmalar için.',
    body: 'Sınırsız sözleşme ve 5 kullanıcıya kadar ekip yönetimi. Yönetici ve personel rolleri, kullanıcı bazlı yetkilendirme ve ekip tahsilat takibiyle birden fazla kişinin aynı portföyde düzenli çalışmasını sağlar.',
  },
];
