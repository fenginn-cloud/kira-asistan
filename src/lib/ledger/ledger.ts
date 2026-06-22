/**
 * Cari Hesap / Kiracı Ledger — tek merkezi muhasebe katmanı.
 *
 * Kaynak gerçeklik (single source of truth):
 *   - `payments`             → aylık kira TAHAKKUKU (amountDue, periodMonth, dueDate)
 *   - `payment_transactions` → kiracının TAHSİLATLARI (payment.amountPaid'e toplanır)
 *
 * Bakiye / devreden / genel durum HİÇBİR yerde kalıcı saklanmaz; her zaman
 * tahakkuk + tahsilattan TÜRETİLİR. Böylece stale (bayat) bakiye olmaz, ödeme
 * silinince/düzenlenince hesap otomatik doğru kalır.
 *
 * Tüm ekranlar (sözleşme detayı, kartlar, dashboard, filtre/sıralama) bu
 * dosyadaki fonksiyonları kullanır — aynı hesap farklı yerde tekrar yazılmaz.
 */
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Contract, Payment } from '@/types';

// ---------------------------------------------------------------------------
// Format yardımcıları
// ---------------------------------------------------------------------------

/** "2026-06-01" | Date -> "2026-06" (ay anahtarı). */
export function getMonthKey(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'yyyy-MM');
}

/** "2026-06-01" -> "Haziran 2026" */
export function formatMonthTR(iso: string): string {
  return format(parseISO(iso), 'MMMM yyyy', { locale: tr });
}

/** Türk Lirası: -2000 -> "-2.000 ₺", 15000 -> "15.000 ₺" */
export function formatCurrencyTRY(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  return (
    sign +
    new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(
      Math.abs(rounded)
    ) +
    ' ₺'
  );
}

// ---------------------------------------------------------------------------
// Durum (status)
// ---------------------------------------------------------------------------

/** Bir ayın ödeme durumu (UI seviyesinde; DB enum'una dokunmaz). */
export type LedgerStatus = 'paid' | 'partial' | 'pending' | 'overdue' | 'overpaid';

export const LEDGER_STATUS_LABEL: Record<LedgerStatus, string> = {
  paid: 'Ödendi',
  partial: 'Kısmi Ödendi',
  pending: 'Ödenmedi',
  overdue: 'Gecikmiş',
  overpaid: 'Fazla Ödeme',
};

/** Tek bir ay için durum: o ayın kendi tahakkuk/tahsilatına göre. */
export function getPaymentStatus(
  due: number,
  paid: number,
  dueDate: string,
  today: Date = new Date()
): LedgerStatus {
  if (due <= 0) return paid > 0 ? 'overpaid' : 'paid';
  if (paid > due) return 'overpaid';
  if (paid >= due) return 'paid';
  const isOverdue = differenceInCalendarDays(today, parseISO(dueDate)) > 0;
  if (paid > 0) return isOverdue ? 'overdue' : 'partial';
  return isOverdue ? 'overdue' : 'pending';
}

// ---------------------------------------------------------------------------
// Bakiye hesapları
// ---------------------------------------------------------------------------

/** O ayın bakiyesi = ödenen - ödenmesi gereken (+ fazla, - eksik). */
export function calculateMonthlyBalance(payment: Payment): number {
  return payment.amountPaid - payment.amountDue;
}

/** Bir ayın gelecekte (henüz tahakkuk etmemiş) olup olmadığı. */
function isFutureMonth(periodMonth: string, today: Date): boolean {
  return getMonthKey(periodMonth) > getMonthKey(today);
}

/**
 * Genel bakiye = toplam ödenen - toplam (tahakkuk etmiş) borç.
 * Gelecek ayların borcu sayılmaz (henüz vadesi gelmedi); ama gelecek aya
 * yapılmış peşin ödeme alacak olarak sayılır.
 * Negatif = kiracı borçlu, pozitif = kiracının alacağı var.
 */
export function calculateTotalBalance(
  payments: Payment[],
  today: Date = new Date()
): number {
  let total = 0;
  for (const p of payments) {
    const accruedDue = isFutureMonth(p.periodMonth, today) ? 0 : p.amountDue;
    total += p.amountPaid - accruedDue;
  }
  return total;
}

/** Sonraki aya devreden alacak (yalnızca pozitif fazla ödeme). */
export function calculateCarryForwardBalance(
  payments: Payment[],
  today: Date = new Date()
): number {
  return Math.max(calculateTotalBalance(payments, today), 0);
}

// ---------------------------------------------------------------------------
// Cari hesap satırları (ay ay defter)
// ---------------------------------------------------------------------------

export interface LedgerRow {
  paymentId: string;
  periodMonth: string;
  monthKey: string;
  monthLabel: string;
  dueDate: string;
  due: number;
  paid: number;
  /** O ayın bakiyesi (ödenen - gereken). */
  monthBalance: number;
  /** O aya kadar olan kümülatif (devreden) bakiye. */
  carryForward: number;
  status: LedgerStatus;
  isFuture: boolean;
}

/**
 * Sözleşmenin ay ay cari hesap defteri (kronolojik). Her satırda o ayın
 * tahakkuku, tahsilatı, ay bakiyesi ve devreden (kümülatif) bakiyesi olur.
 */
export function generateLedgerRows(
  payments: Payment[],
  today: Date = new Date()
): LedgerRow[] {
  const sorted = [...payments].sort((a, b) =>
    a.periodMonth.localeCompare(b.periodMonth)
  );
  let running = 0;
  return sorted.map((p) => {
    const future = isFutureMonth(p.periodMonth, today);
    running += p.amountPaid - (future ? 0 : p.amountDue);
    return {
      paymentId: p.id,
      periodMonth: p.periodMonth,
      monthKey: getMonthKey(p.periodMonth),
      monthLabel: formatMonthTR(p.periodMonth),
      dueDate: p.dueDate,
      due: p.amountDue,
      paid: p.amountPaid,
      monthBalance: p.amountPaid - p.amountDue,
      carryForward: running,
      status: getPaymentStatus(p.amountDue, p.amountPaid, p.dueDate, today),
      isFuture: future,
    };
  });
}

// ---------------------------------------------------------------------------
// Özetler
// ---------------------------------------------------------------------------

export interface MonthSummary {
  periodMonth: string | null;
  due: number;
  paid: number;
  remaining: number;
  status: LedgerStatus;
}

/** İçinde bulunulan ayın özeti. Kayıt yoksa kira tutarından türetir. */
export function getCurrentMonthSummary(
  contract: Contract,
  payments: Payment[],
  today: Date = new Date()
): MonthSummary {
  const key = getMonthKey(today);
  const p = payments.find((pp) => getMonthKey(pp.periodMonth) === key);
  const due = p?.amountDue ?? contract.rentAmount + contract.duesAmount;
  const paid = p?.amountPaid ?? 0;
  return {
    periodMonth: p?.periodMonth ?? null,
    due,
    paid,
    remaining: Math.max(due - paid, 0),
    status: p
      ? getPaymentStatus(due, paid, p.dueDate, today)
      : due > 0
        ? 'pending'
        : 'paid',
  };
}

export type ContractLedgerStatus = 'settled' | 'debtor' | 'creditor' | 'overdue';

export const CONTRACT_LEDGER_LABEL: Record<ContractLedgerStatus, string> = {
  settled: 'Güncel',
  debtor: 'Borçlu',
  creditor: 'Alacaklı',
  overdue: 'Gecikmiş',
};

export interface ContractBalance {
  monthlyRent: number;
  currentMonth: MonthSummary;
  /** Genel bakiye (signed). Negatif = borçlu, pozitif = alacaklı. */
  totalBalance: number;
  /** Toplam borç (pozitif gösterim). */
  totalDebt: number;
  /** Toplam alacak / fazla ödeme (pozitif gösterim). */
  totalCredit: number;
  hasOverdue: boolean;
  status: ContractLedgerStatus;
  statusLabel: string;
}

/** Bir sözleşmenin tüm cari hesap özeti — kart, detay ve filtreler kullanır. */
export function getContractBalance(
  contract: Contract,
  payments: Payment[],
  today: Date = new Date()
): ContractBalance {
  const currentMonth = getCurrentMonthSummary(contract, payments, today);
  const totalBalance = calculateTotalBalance(payments, today);
  const currentKey = getMonthKey(today);
  const hasOverdue = payments.some(
    (p) =>
      getMonthKey(p.periodMonth) <= currentKey &&
      getPaymentStatus(p.amountDue, p.amountPaid, p.dueDate, today) === 'overdue'
  );

  let status: ContractLedgerStatus;
  if (totalBalance > 0) status = 'creditor';
  else if (totalBalance < 0) status = hasOverdue ? 'overdue' : 'debtor';
  else status = 'settled';

  return {
    monthlyRent: contract.rentAmount,
    currentMonth,
    totalBalance,
    totalDebt: Math.max(-totalBalance, 0),
    totalCredit: Math.max(totalBalance, 0),
    hasOverdue,
    status,
    statusLabel: CONTRACT_LEDGER_LABEL[status],
  };
}

// ---------------------------------------------------------------------------
// Dashboard finansal özeti
// ---------------------------------------------------------------------------

export interface DashboardFinance {
  expectedThisMonth: number;
  collectedThisMonth: number;
  remainingThisMonth: number;
  totalShort: number;
  totalOver: number;
  netBalance: number;
  overdueContracts: number;
  partialContracts: number;
}

/** Tüm aktif sözleşmeler üzerinden ana sayfa finansal özeti. */
export function getDashboardFinancialSummary(
  contracts: Contract[],
  payments: Payment[],
  today: Date = new Date()
): DashboardFinance {
  const byContract = new Map<string, Payment[]>();
  for (const p of payments) {
    const arr = byContract.get(p.contractId);
    if (arr) arr.push(p);
    else byContract.set(p.contractId, [p]);
  }

  const out: DashboardFinance = {
    expectedThisMonth: 0,
    collectedThisMonth: 0,
    remainingThisMonth: 0,
    totalShort: 0,
    totalOver: 0,
    netBalance: 0,
    overdueContracts: 0,
    partialContracts: 0,
  };

  for (const c of contracts) {
    if (c.status !== 'active') continue;
    const cp = byContract.get(c.id) ?? [];
    const bal = getContractBalance(c, cp, today);
    out.expectedThisMonth += bal.currentMonth.due;
    out.collectedThisMonth += bal.currentMonth.paid;
    out.totalShort += bal.totalDebt;
    out.totalOver += bal.totalCredit;
    out.netBalance += bal.totalBalance;
    if (bal.hasOverdue) out.overdueContracts += 1;
    if (
      bal.currentMonth.status === 'partial' ||
      bal.currentMonth.status === 'overdue'
    ) {
      out.partialContracts += 1;
    }
  }
  out.remainingThisMonth = Math.max(
    out.expectedThisMonth - out.collectedThisMonth,
    0
  );
  return out;
}

// ---------------------------------------------------------------------------
// Tahakkuk üretimi (re-export — tek giriş noktası)
// ---------------------------------------------------------------------------

export { recentPaymentPeriods as generateMonthlyCharges } from '../utils/paymentPeriods';
