/**
 * Tahakkuk (aylık kira borcu) kuralları — TEK MERKEZ.
 *
 * Hangi aylar için kira borcu oluşur?
 *   - Başlangıç: `trackingStart` (yoksa sözleşme başlangıç ayı). Bundan önceki
 *     aylar "bilinmiyor" kabul edilir; otomatik borç/tahsilat yazılmaz. Takip
 *     öncesi gerçek borç varsa sözleşmeye "başlangıç bakiyesi" olarak girilir.
 *   - Bitiş:
 *       · Aktif sözleşme → içinde bulunulan ay + 1 (gelecek ay "Bekliyor").
 *         Bitiş tarihi geçmişse ve `autoRenew` açıksa takip AYNI KOŞULLARLA
 *         sürer (sessizce durmaz). `autoRenew` kapalıysa bitiş ayında durur ve
 *         arayüz bunu "Süresi doldu · takip durdu" olarak açıkça gösterir.
 *       · Sonlandırılmış → kiracı çıkış ayı (terminatedAt). Sonrası tahakkuk etmez,
 *         ama geçmişten kalan borç tahsil edilebilir.
 *       · Pasif → yeni tahakkuk yok (yalnızca kayıtlı aylar).
 *
 * Bu modül SAF fonksiyonlardan oluşur; veritabanına yazmaz. Kayıtlı olmayan
 * beklenen aylar `virtual: true` ödeme nesneleri olarak döner. Böylece bir
 * ekranı açmak bakiyeyi değiştirmez; tahsilat girildiğinde ilgili ay kaydedilir.
 */
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { Contract, Payment } from '@/types';

const VIRTUAL_PREFIX = 'v:';

/** "2026-06-17" | Date → "2026-06-01" */
export function monthStart(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(startOfMonth(d), 'yyyy-MM-dd');
}

export function virtualPaymentId(contractId: string, periodMonth: string): string {
  return `${VIRTUAL_PREFIX}${contractId}:${periodMonth.slice(0, 10)}`;
}

export function isVirtualPaymentId(id: string): boolean {
  return id.startsWith(VIRTUAL_PREFIX);
}

/** `v:<contractId>:<YYYY-MM-01>` → parçalar. */
export function parseVirtualPaymentId(
  id: string
): { contractId: string; periodMonth: string } | null {
  if (!isVirtualPaymentId(id)) return null;
  const rest = id.slice(VIRTUAL_PREFIX.length);
  const i = rest.lastIndexOf(':');
  if (i <= 0) return null;
  return { contractId: rest.slice(0, i), periodMonth: rest.slice(i + 1) };
}

/** Vade: ödeme günü, ay uzunluğuna kırpılmış. */
export function dueDateFor(periodMonth: string, paymentDay: number): string {
  const m = parseISO(periodMonth);
  const day = Math.min(Math.max(paymentDay || 1, 1), endOfMonth(m).getDate());
  return format(new Date(m.getFullYear(), m.getMonth(), day), 'yyyy-MM-dd');
}

/** Takibin başladığı ay (sözleşme başlangıcından önce olamaz). */
export function trackingStartMonth(c: Contract): string {
  const start = monthStart(c.startDate);
  if (!c.trackingStart) return start;
  const t = monthStart(c.trackingStart);
  return t > start ? t : start;
}

/** Sözleşmenin bitiş tarihi geçti mi (gün olarak)? */
export function isPastEndDate(c: Contract, today = new Date()): boolean {
  return !!c.endDate && differenceInCalendarDays(parseISO(c.endDate), today) < 0;
}

/**
 * Otomatik tahakkukun son ayı (dahil). null → yeni ay tahakkuk etmez.
 */
export function lastAccrualMonth(c: Contract, today = new Date()): string | null {
  const horizon = monthStart(addMonths(today, 1)); // gelecek ay "Bekliyor"
  if (c.status === 'terminated') {
    return c.terminatedAt ? monthStart(c.terminatedAt) : null;
  }
  if (c.status !== 'active') return null;
  if (c.endDate && c.autoRenew === false) {
    const end = monthStart(c.endDate);
    return end < horizon ? end : horizon;
  }
  return horizon;
}

/** Bir ayın tahakkuk tutarı (ileri tarihli kira artışı dikkate alınır). */
export function amountForMonth(c: Contract, periodMonth: string): number {
  if (c.nextRentFrom && periodMonth >= monthStart(c.nextRentFrom)) {
    return (c.nextRentAmount ?? c.rentAmount) + (c.nextDuesAmount ?? c.duesAmount);
  }
  return c.rentAmount + c.duesAmount;
}

export interface ExpectedPeriod {
  contractId: string;
  periodMonth: string;
  dueDate: string;
  amountDue: number;
}

/** Sözleşme kurallarına göre olması gereken tüm aylık tahakkuklar. */
export function expectedPeriods(c: Contract, today = new Date()): ExpectedPeriod[] {
  const last = lastAccrualMonth(c, today);
  if (!last) return [];
  const out: ExpectedPeriod[] = [];
  let m = trackingStartMonth(c);
  // Güvenlik sınırı: en fazla 20 yıl.
  for (let i = 0; m <= last && i < 240; i++) {
    out.push({
      contractId: c.id,
      periodMonth: m,
      dueDate: dueDateFor(m, c.paymentDay),
      amountDue: amountForMonth(c, m),
    });
    m = monthStart(addMonths(parseISO(m), 1));
  }
  return out;
}

/**
 * Kayıtlı ödemeleri beklenen aylarla birleştirir. Kayıtlı ay her zaman öncelikli
 * (geçmiş tutarlar korunur). Eksik aylar `virtual` olarak eklenir.
 */
export function withExpectedPayments(
  c: Contract,
  stored: Payment[],
  today = new Date()
): Payment[] {
  const start = trackingStartMonth(c);
  const last = lastAccrualMonth(c, today);
  // Takip aralığı dışındaki, HİÇ tahsilatı olmayan kayıtlar borç sayılmaz
  // (silinmez; ör. eski sürümün "son 3 ay"ı ya da çıkış sonrası boş tahakkuk).
  // Tahsilatı olan ay ve başlangıç bakiyesi her zaman dahildir.
  const own = stored.filter(
    (p) =>
      p.contractId === c.id &&
      (p.kind === 'opening' ||
        p.amountPaid > 0 ||
        (p.periodMonth.slice(0, 10) >= start &&
          (last === null || p.periodMonth.slice(0, 10) <= last)))
  );
  const have = new Set(own.map((p) => p.periodMonth.slice(0, 10)));
  const out = [...own];
  for (const e of expectedPeriods(c, today)) {
    if (have.has(e.periodMonth)) continue;
    out.push({
      id: virtualPaymentId(c.id, e.periodMonth),
      contractId: c.id,
      periodMonth: e.periodMonth,
      dueDate: e.dueDate,
      amountDue: e.amountDue,
      amountPaid: 0,
      status: differenceInCalendarDays(parseISO(e.dueDate), today) < 0 ? 'overdue' : 'pending',
      paidAt: null,
      note: null,
      kind: 'rent',
      virtual: true,
    });
  }
  return out;
}

/** Tüm sözleşmeler için birleştirme (listAll). */
export function withExpectedPaymentsAll(
  contracts: Contract[],
  stored: Payment[],
  today = new Date()
): Payment[] {
  const byContract = new Map<string, Payment[]>();
  for (const p of stored) {
    const arr = byContract.get(p.contractId);
    if (arr) arr.push(p);
    else byContract.set(p.contractId, [p]);
  }
  const out: Payment[] = [];
  const known = new Set<string>();
  for (const c of contracts) {
    known.add(c.id);
    out.push(...withExpectedPayments(c, byContract.get(c.id) ?? [], today));
  }
  // Sözleşmesi listede olmayan kayıtlar (ör. yetki) olduğu gibi kalır.
  for (const p of stored) if (!known.has(p.contractId)) out.push(p);
  return out;
}

// ---------------------------------------------------------------------------
// Tahsilat: açık aylar ve varsayılan seçim
// ---------------------------------------------------------------------------

export function remainingOf(p: Payment): number {
  return Math.max(p.amountDue - p.amountPaid, 0);
}

/**
 * Tahsilat penceresinde seçilebilecek aylar: kalan borcu olan, içinde bulunulan
 * ay ve öncesi (sonlandırılmış sözleşmede geçmiş borçlar dahil). Hiç yoksa en
 * yakın gelecek ay (peşin ödeme) sunulur. En eskiden yeniye sıralı.
 */
export function collectibleMonths(payments: Payment[], today = new Date()): Payment[] {
  const currentKey = format(today, 'yyyy-MM');
  const sorted = [...payments].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
  const open = sorted.filter(
    (p) => remainingOf(p) > 0 && p.periodMonth.slice(0, 7) <= currentKey
  );
  if (open.length > 0) return open;
  const next = sorted.find((p) => remainingOf(p) > 0 && p.periodMonth.slice(0, 7) > currentKey);
  return next ? [next] : [];
}

/** Varsayılan: en eski açık ay. */
export function defaultCollectionMonth(
  payments: Payment[],
  today = new Date()
): Payment | null {
  return collectibleMonths(payments, today)[0] ?? null;
}

export interface DebtSummary {
  /** Vadesi geçmiş, ödenmemiş toplam (pozitif). */
  total: number;
  /** Borçlu (vadesi geçmiş, kalanı olan) ay sayısı. */
  months: number;
  /** Ay bazlı döküm (en eski önce). */
  items: { payment: Payment; remaining: number; daysLate: number }[];
}

/** Kiracının vadesi geçmiş borç dökümü (ana sayfa satırı için). */
export function overdueDebt(payments: Payment[], today = new Date()): DebtSummary {
  const items = payments
    .filter(
      (p) => remainingOf(p) > 0 && differenceInCalendarDays(parseISO(p.dueDate), today) < 0
    )
    .sort((a, b) => a.periodMonth.localeCompare(b.periodMonth))
    .map((p) => ({
      payment: p,
      remaining: remainingOf(p),
      daysLate: -differenceInCalendarDays(parseISO(p.dueDate), today),
    }));
  return {
    total: items.reduce((s, i) => s + i.remaining, 0),
    months: items.length,
    items,
  };
}

// ---------------------------------------------------------------------------
// Sözleşme yaşam döngüsü etiketi
// ---------------------------------------------------------------------------

export type ContractPhase =
  | 'active'
  | 'expired_renewing'
  | 'expired_stopped'
  | 'terminated'
  | 'passive';

export const CONTRACT_PHASE_LABEL: Record<ContractPhase, string> = {
  active: 'Aktif',
  expired_renewing: 'Süresi doldu · uzuyor',
  expired_stopped: 'Süresi doldu · takip durdu',
  terminated: 'Sonlandırıldı',
  passive: 'Pasif',
};

export function contractPhase(c: Contract, today = new Date()): ContractPhase {
  if (c.status === 'terminated') return 'terminated';
  if (c.status === 'passive') return 'passive';
  if (isPastEndDate(c, today)) {
    return c.autoRenew === false ? 'expired_stopped' : 'expired_renewing';
  }
  return 'active';
}

/** Yeni kira borcu üretmeyen (arşivlik) sözleşme mi? */
export function isClosedContract(c: Contract): boolean {
  return c.status === 'terminated' || c.status === 'passive';
}
