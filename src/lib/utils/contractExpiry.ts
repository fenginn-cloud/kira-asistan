import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Contract } from '@/types';

/** Days until the contract's end date. Positive = remaining, negative = past, null = no end date. */
export function daysUntilEnd(contract: Contract, today = new Date()): number | null {
  if (!contract.endDate) return null;
  return differenceInCalendarDays(parseISO(contract.endDate), today);
}

export interface ExpiringContract {
  contract: Contract;
  /** Days until end (negative = already expired). */
  daysLeft: number;
}

/**
 * Active contracts whose end date is within `withinDays` ahead, including ones
 * that recently expired (down to `expiredWithin` days ago). Soonest/most overdue
 * first — these are the renewal / rent-increase opportunities.
 */
export function expiringContracts(
  contracts: Contract[],
  withinDays = 60,
  expiredWithin = 90,
  today = new Date()
): ExpiringContract[] {
  const out: ExpiringContract[] = [];
  for (const c of contracts) {
    if (c.status !== 'active') continue;
    const d = daysUntilEnd(c, today);
    if (d === null) continue;
    if (d <= withinDays && d >= -expiredWithin) out.push({ contract: c, daysLeft: d });
  }
  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Human label for the remaining/elapsed time. */
export function expiryLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} gün önce doldu`;
  if (daysLeft === 0) return 'Bugün bitiyor';
  return `${daysLeft} gün içinde bitiyor`;
}

/** True when the contract needs renewal attention (≤30 days or already expired). */
export function isExpiringSoon(contract: Contract, today = new Date()): boolean {
  const d = daysUntilEnd(contract, today);
  return d !== null && d <= 30;
}
