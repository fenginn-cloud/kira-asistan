/**
 * Bina adı: mülk adının sonundaki daire/no ekini atar.
 * "EGE İREM 21" → "EGE İREM", "SERDEN GEÇTİ A1" → "SERDEN GEÇTİ",
 * "ÖZ APT 5" → "ÖZ APT", "Dream Rezidans" → "Dream Rezidans".
 */
export function buildingName(propertyName: string): string {
  const trimmed = (propertyName ?? '').trim();
  const stripped = trimmed.replace(/\s+[A-Za-zÇĞİÖŞÜçğıöşü]?\d+\s*$/, '').trim();
  return stripped || trimmed;
}

/**
 * Arama için Türkçe-duyarlı, aksan-duyarsız katlama.
 * "ÖZ APT 1", "öz apt 1", "oz apt 1", "Öz Apt" → hepsi "oz apt 1".
 * İ/I/ı ve ö/ç/ş/ğ/ü ASCII karşılığına indirgenir; harf büyüklüğü fark etmez.
 */
export function foldSearch(s: string): string {
  return (s ?? '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
