import { foldSearch } from './property';

/**
 * Blok adı normalizasyonu (yazıma DUYARSIZ, merkezî).
 *
 * Sorun: "b Blok" ile "B Blok" aynı blok olmasına rağmen ayrı kayıt/grup gibi
 * görünüyordu. Çözüm iki parça:
 *   - normalizeBlock: kanonik GÖRÜNÜM ("b blok" / "B BLOK" → "B Blok").
 *     Baş/son boşluk temizlenir, iç boşluklar tekleştirilir, her kelime
 *     Türkçe-duyarlı başlık biçimine getirilir.
 *   - blockKey: yazıma duyarsız GRUPLAMA/KARŞILAŞTIRMA anahtarı
 *     ("b Blok" ve "B Blok" aynı anahtara iner).
 *
 * Yazarken normalizeBlock ile saklanır; listeleme/gruplama/filtrede blockKey
 * kullanılır. Böylece hem yeni veri standart olur hem de eski/karışık veri
 * doğru gruplanır.
 */
export function normalizeBlock(raw: string | null | undefined): string {
  const cleaned = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  return cleaned
    .split(' ')
    .map((w) =>
      w ? w.charAt(0).toLocaleUpperCase('tr-TR') + w.slice(1).toLocaleLowerCase('tr-TR') : w
    )
    .join(' ');
}

/** Yazıma/boşluğa duyarsız gruplama & karşılaştırma anahtarı. */
export function blockKey(raw: string | null | undefined): string {
  return foldSearch((raw ?? '').trim().replace(/\s+/g, ' '));
}
