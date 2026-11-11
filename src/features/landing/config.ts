/**
 * Landing page merkezi yapılandırma. Store yayını hazır olmadığından URL'ler
 * boş; boşken ilgili rozet/gösterilmez (sahte link üretilmez).
 */
export const APP_STORE_URL = '';
export const GOOGLE_PLAY_URL = '';

/** Statik SEO sayfaları (scripts/seo ile build'de üretilir) — landing footer'ında gerçek link. */
export const FREE_TOOL_LINKS = [
  { label: 'Kira Artış Hesaplama', href: '/kira-artis-hesaplama' },
  { label: 'Kira Sözleşmesi Örneği', href: '/sablonlar/kira-sozlesmesi-ornegi' },
  { label: 'Ücretsiz Belge Şablonları', href: '/sablonlar/' },
];
