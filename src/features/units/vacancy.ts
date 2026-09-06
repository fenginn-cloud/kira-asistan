/**
 * Boş bir dairenin ne kadar zamandır boş olduğunu okunur etikete çevirir.
 * vacantSince (YYYY-MM-DD) yoksa sade "Boş" döner. İleride hedef kira, ilan
 * durumu gibi alanlar eklenebilir — bu modül o mantığın tek yeri.
 */
export function vacancyDays(vacantSince: string | null, now: Date = new Date()): number | null {
  if (!vacantSince) return null;
  const start = new Date(vacantSince + 'T00:00:00');
  if (Number.isNaN(start.getTime())) return null;
  const ms = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function vacancyLabel(vacantSince: string | null, now: Date = new Date()): string {
  const d = vacancyDays(vacantSince, now);
  if (d === null) return 'Boş';
  if (d === 0) return 'Bugün boşaldı';
  if (d < 30) return `${d} gündür boş`;
  const months = Math.floor(d / 30);
  return months < 12 ? `${months} aydır boş` : `${Math.floor(months / 12)} yıldır boş`;
}
