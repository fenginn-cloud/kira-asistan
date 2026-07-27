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
