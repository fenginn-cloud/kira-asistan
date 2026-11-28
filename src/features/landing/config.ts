/**
 * Landing page merkezi yapılandırma. Boş bırakılan mağaza bağlantısının rozeti
 * gösterilmez (sahte/çalışmayan link üretilmez).
 */
export const APP_STORE_URL = 'https://apps.apple.com/tr/app/kira-asistan/id6812990992';
/** Google Play yayını henüz yok. */
export const GOOGLE_PLAY_URL = '';

/** Statik SEO sayfaları (scripts/seo ile build'de üretilir) — landing footer'ında gerçek link. */
export const FREE_TOOL_LINKS = [
  { label: 'Kira Artış Hesaplama', href: '/kira-artis-hesaplama' },
  { label: 'Kira Sözleşmesi Örneği', href: '/sablonlar/kira-sozlesmesi-ornegi' },
  { label: 'Ücretsiz Belge Şablonları', href: '/sablonlar/' },
];
