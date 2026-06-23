/**
 * Yasal metinler (şablon). Bunlar bilgilendirme amaçlı taslaklardır; satıştan
 * önce bir hukuk danışmanına gözden geçirtilmesi önerilir. [köşeli parantezli]
 * alanları kendi tüzel kişi/iletişim bilgilerinizle doldurun.
 */

export interface LegalSection {
  heading?: string;
  body: string;
}

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  sections: LegalSection[];
}

const UPDATED = 'Haziran 2026';
const OPERATOR = '[Şirket Unvanı]';
const CONTACT = 'iletisim@kiraasistan.com';

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  gizlilik: {
    slug: 'gizlilik',
    title: 'Gizlilik Politikası',
    updated: UPDATED,
    sections: [
      {
        body: `Bu Gizlilik Politikası, Kira Asistan uygulamasını (“Uygulama”) kullanırken kişisel verilerinizin nasıl işlendiğini açıklar. Veri sorumlusu ${OPERATOR}'dir.`,
      },
      {
        heading: 'Hangi verileri işliyoruz?',
        body: `• Hesap bilgileri: ad-soyad, e-posta, telefon, rol.\n• Şirket/portföy bilgileri: şirket adı, mülk ve sözleşme kayıtları.\n• Kiracı bilgileri: ad-soyad, telefon, (girilirse) TC kimlik, kira ve ödeme kayıtları.\n• Ödeme/dekont belgeleri ve cari hesap hareketleri.\n• Teknik kayıtlar: oturum, cihaz ve bildirim aboneliği bilgileri.`,
      },
      {
        heading: 'Verileri ne için kullanıyoruz?',
        body: `Kira takibi, cari hesap hesaplaması, ödeme hatırlatmaları (uygulama içi ve mobil bildirim), kiracı ödeme linki ve isteğe bağlı yapay zekâ destekli analiz özelliklerini sunmak için.`,
      },
      {
        heading: 'Yapay zekâ destekli analiz',
        body: `“AI Asistan” özelliğini kullandığınızda, sorunuzu yanıtlamak için yalnızca sizin şirketinize ait özetlenmiş veriler (kiracı adı, mülk, tutar özetleri) işlenmek üzere AI servis sağlayıcısına iletilir. Kiracı telefon numarası ve kimlik bilgileri AI'ya gönderilmez. AI yanıtları bir öneridir; mali/hukuki tavsiye değildir.`,
      },
      {
        heading: 'Verilerin paylaşımı',
        body: `Verileriniz; barındırma (Supabase), bildirim ve (kullanılırsa) yapay zekâ altyapı sağlayıcıları gibi hizmet sağlayıcılarla, yalnızca hizmetin sunulması amacıyla işlenir. Verileriniz pazarlama amacıyla üçüncü taraflara satılmaz.`,
      },
      {
        heading: 'Saklama ve güvenlik',
        body: `Veriler, her şirketin yalnızca kendi verisine erişebildiği satır-düzeyi güvenlik (RLS) ile izole edilir. Veriler, hizmet sunulduğu sürece ve yasal yükümlülükler gerektirdiği müddetçe saklanır.`,
      },
      {
        heading: 'Haklarınız',
        body: `KVKK kapsamındaki haklarınızı (erişim, düzeltme, silme vb.) kullanmak için ${CONTACT} adresinden bize ulaşabilirsiniz.`,
      },
    ],
  },

  kullanim: {
    slug: 'kullanim',
    title: 'Kullanım Şartları',
    updated: UPDATED,
    sections: [
      {
        body: `Kira Asistan'ı kullanarak aşağıdaki şartları kabul etmiş olursunuz.`,
      },
      {
        heading: 'Hizmetin kapsamı',
        body: `Uygulama; kira sözleşmesi, ödeme ve cari hesap takibi ile hatırlatma araçları sunar. Bir muhasebe, hukuk veya mali danışmanlık hizmeti değildir. Sunulan hesaplamalar ve öneriler bilgilendirme amaçlıdır; nihai sorumluluk kullanıcıdadır.`,
      },
      {
        heading: 'Kullanıcı sorumlulukları',
        body: `• Girdiğiniz verilerin doğruluğundan siz sorumlusunuz.\n• Kiracılara ait kişisel verileri işlemek için gerekli hukuki dayanağa (ör. sözleşme) sahip olduğunuzu beyan edersiniz.\n• Hesap güvenliğinizden ve paylaştığınız kiracı bağlantılarından siz sorumlusunuz.`,
      },
      {
        heading: 'Kiracı ödeme linki',
        body: `Kiracıya özel link ile alınan ödeme bildirimleri yalnızca birer beyandır; cari hesaba işlenmesi mülk sahibinin onayına bağlıdır.`,
      },
      {
        heading: 'Sorumluluğun sınırlandırılması',
        body: `Hizmet “olduğu gibi” sunulur. ${OPERATOR}, dolaylı zararlardan veya veri giriş hatalarından kaynaklanan sonuçlardan sorumlu tutulamaz.`,
      },
      {
        heading: 'İletişim',
        body: `Sorularınız için: ${CONTACT}`,
      },
    ],
  },

  kvkk: {
    slug: 'kvkk',
    title: 'KVKK Aydınlatma Metni',
    updated: UPDATED,
    sections: [
      {
        body: `6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, veri sorumlusu ${OPERATOR} tarafından kişisel verilerinizin işlenmesine ilişkin olarak sizi bilgilendiririz.`,
      },
      {
        heading: 'İşlenen veriler ve amaç',
        body: `Kimlik ve iletişim bilgileri ile kira/ödeme kayıtları; kira takibi, cari hesap yönetimi, ödeme hatırlatmaları ve talep hâlinde yapay zekâ destekli analiz amacıyla işlenir.`,
      },
      {
        heading: 'Hukuki sebep',
        body: `Veriler; sözleşmenin kurulması/ifası ve veri sorumlusunun meşru menfaati hukuki sebeplerine dayanılarak işlenir.`,
      },
      {
        heading: 'Aktarım',
        body: `Veriler, hizmetin sunulması için kullanılan barındırma, bildirim ve yapay zekâ altyapı sağlayıcılarına aktarılabilir. Bazı sağlayıcılar yurt dışında bulunabilir; bu durumda KVKK'nın aktarım kuralları gözetilir.`,
      },
      {
        heading: 'Haklarınız',
        body: `KVKK m.11 kapsamında; verilerinize erişme, düzeltilmesini/silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Başvurularınızı ${CONTACT} adresine iletebilirsiniz.`,
      },
    ],
  },
};

export const LEGAL_LINKS: { slug: string; title: string }[] = [
  { slug: 'gizlilik', title: 'Gizlilik Politikası' },
  { slug: 'kullanim', title: 'Kullanım Şartları' },
  { slug: 'kvkk', title: 'KVKK Aydınlatma Metni' },
];
