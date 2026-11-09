import { describe, expect, it } from 'vitest';
import {
  collectibleMonths,
  contractPhase,
  defaultCollectionMonth,
  expectedPeriods,
  lastAccrualMonth,
  overdueDebt,
  parseVirtualPaymentId,
  virtualPaymentId,
  withExpectedPayments,
} from './accrual';
import { getContractBalance } from './ledger';
import type { Contract, Payment } from '@/types';

const TODAY = new Date(2026, 6, 20); // 20 Temmuz 2026

function contract(over: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    companyId: 'co',
    assignedUserId: null,
    propertyName: 'Marina Park',
    block: 'C',
    unit: '4',
    tenantName: 'Elif',
    tenantPhone: '1',
    tenantNationalId: null,
    ownerName: 'S',
    ownerPhone: '2',
    rentAmount: 10000,
    duesAmount: 0,
    depositAmount: 20000,
    startDate: '2025-07-01',
    endDate: '2026-06-30',
    paymentDay: 5,
    notes: null,
    status: 'active',
    documentUrl: null,
    notifyOwner: true,
    notifyTenant: false,
    notifyStaff: true,
    trackingStart: '2026-05-01',
    autoRenew: true,
    createdAt: '2026-05-01T00:00:00Z',
    ...over,
  };
}

function pay(period: string, paid: number, over: Partial<Payment> = {}): Payment {
  return {
    id: `p-${period}`,
    contractId: 'c1',
    periodMonth: period,
    dueDate: `${period.slice(0, 8)}05`,
    amountDue: 10000,
    amountPaid: paid,
    status: 'pending',
    paidAt: null,
    note: null,
    kind: 'rent',
    ...over,
  };
}

describe('Bulgu 1 — bitişi geçen sözleşmede takip', () => {
  it('autoRenew açıkken bitiş sonrası aylar tahakkuk etmeye devam eder', () => {
    const months = expectedPeriods(contract(), TODAY).map((e) => e.periodMonth);
    expect(months).toEqual(['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01']);
    expect(contractPhase(contract(), TODAY)).toBe('expired_renewing');
  });

  it('autoRenew kapalıyken bitiş ayında durur ve bu AÇIKÇA etiketlenir', () => {
    const c = contract({ autoRenew: false });
    expect(lastAccrualMonth(c, TODAY)).toBe('2026-06-01');
    expect(contractPhase(c, TODAY)).toBe('expired_stopped');
  });

  it('20 Temmuz senaryosu: Temmuz borcu görünür (eski sürümde hiç oluşmuyordu)', () => {
    const merged = withExpectedPayments(contract(), [pay('2026-05-01', 10000), pay('2026-06-01', 10000)], TODAY);
    const july = merged.find((p) => p.periodMonth === '2026-07-01');
    expect(july?.virtual).toBe(true);
    expect(overdueDebt(merged, TODAY)).toMatchObject({ total: 10000, months: 1 });
  });
});

describe('Bulgu 5 — görüntüleme borç üretmez / takip başlangıcı', () => {
  it('takip başlangıcından önceki aylar için otomatik borç yok', () => {
    const c = contract({ startDate: '2025-01-01', endDate: null, trackingStart: '2026-07-01' });
    const months = expectedPeriods(c, TODAY).map((e) => e.periodMonth);
    expect(months[0]).toBe('2026-07-01');
  });

  it('aynı girdiyle her hesaplama aynı bakiyeyi verir (yan etkisiz)', () => {
    const c = contract();
    const stored = [pay('2026-05-01', 10000)];
    const a = getContractBalance(c, withExpectedPayments(c, stored, TODAY), TODAY);
    const b = getContractBalance(c, withExpectedPayments(c, stored, TODAY), TODAY);
    expect(a.totalDebt).toBe(b.totalDebt);
    expect(stored).toHaveLength(1); // girdi değişmedi
  });

  it('takip aralığı dışındaki tahsilatsız eski kayıt borç sayılmaz, tahsilatlı kayıt korunur', () => {
    const c = contract({ trackingStart: '2026-06-01' });
    const merged = withExpectedPayments(c, [pay('2026-04-01', 0), pay('2026-03-01', 4000)], TODAY);
    expect(merged.some((p) => p.periodMonth === '2026-04-01')).toBe(false);
    expect(merged.some((p) => p.periodMonth === '2026-03-01')).toBe(true);
  });

  it('başlangıç bakiyesi satırı her zaman borca dahildir', () => {
    const c = contract({ trackingStart: '2026-07-01' });
    const opening = pay('2026-06-01', 0, { kind: 'opening', amountDue: 7000, dueDate: '2026-06-01' });
    const merged = withExpectedPayments(c, [opening], TODAY);
    expect(overdueDebt(merged, TODAY).total).toBe(17000); // 7000 + Temmuz 10000
  });
});

describe('Bulgu 2/3/6 — tahsilat ayı seçimi', () => {
  it('varsayılan ay EN ESKİ açık aydır; seçenekler eskiden yeniye', () => {
    const merged = withExpectedPayments(contract(), [pay('2026-05-01', 10000), pay('2026-06-01', 3000)], TODAY);
    const months = collectibleMonths(merged, TODAY).map((p) => p.periodMonth);
    expect(months).toEqual(['2026-06-01', '2026-07-01']);
    expect(defaultCollectionMonth(merged, TODAY)?.periodMonth).toBe('2026-06-01');
  });

  it('açık borç yoksa en yakın gelecek ay (peşin) sunulur', () => {
    const c = contract({ endDate: null });
    const merged = withExpectedPayments(c, [pay('2026-05-01', 10000), pay('2026-06-01', 10000), pay('2026-07-01', 10000)], TODAY);
    expect(collectibleMonths(merged, TODAY).map((p) => p.periodMonth)).toEqual(['2026-08-01']);
  });

  it('Bulgu 4 — toplam borç + ay sayısı + döküm', () => {
    const merged = withExpectedPayments(contract({ trackingStart: '2026-03-01' }), [
      pay('2026-03-01', 0),
      pay('2026-04-01', 10000),
      pay('2026-05-01', 1000),
    ], TODAY);
    const d = overdueDebt(merged, TODAY);
    expect(d.months).toBe(4); // Mart, Mayıs(kısmi), Haziran, Temmuz
    expect(d.total).toBe(10000 + 9000 + 10000 + 10000);
    expect(d.items[0]?.payment.periodMonth).toBe('2026-03-01');
  });
});

describe('Bulgu 7/8 — kira artışı ve çıkış', () => {
  it('ileri tarihli kira artışı yalnızca geçerlilik ayından itibaren uygulanır', () => {
    const c = contract({ endDate: null, nextRentAmount: 12000, nextDuesAmount: 0, nextRentFrom: '2026-08-01' });
    const byMonth = Object.fromEntries(expectedPeriods(c, TODAY).map((e) => [e.periodMonth, e.amountDue]));
    expect(byMonth['2026-07-01']).toBe(10000);
    expect(byMonth['2026-08-01']).toBe(12000);
  });

  it('sonlandırılmış sözleşmede çıkış ayından sonra borç yok; geçmiş borç tahsil edilebilir', () => {
    const c = contract({ status: 'terminated', terminatedAt: '2026-06-15', endDate: null });
    const merged = withExpectedPayments(c, [pay('2026-05-01', 0), pay('2026-08-01', 0)], TODAY);
    expect(merged.map((p) => p.periodMonth).sort()).toEqual(['2026-05-01', '2026-06-01']);
    expect(collectibleMonths(merged, TODAY).map((p) => p.periodMonth)).toEqual(['2026-05-01', '2026-06-01']);
    expect(contractPhase(c, TODAY)).toBe('terminated');
  });

  it('pasif sözleşmede yeni ay oluşmaz ama kayıtlı borç kalır', () => {
    const c = contract({ status: 'passive' });
    const merged = withExpectedPayments(c, [pay('2026-05-01', 0)], TODAY);
    expect(merged).toHaveLength(1);
  });
});

describe('sanal ödeme kimliği', () => {
  it('kimlik çift yönlü çözülür (uuid içinde ":" yok varsayımı gerekmez)', () => {
    const id = virtualPaymentId('abc-123', '2026-07-01');
    expect(parseVirtualPaymentId(id)).toEqual({ contractId: 'abc-123', periodMonth: '2026-07-01' });
    expect(parseVirtualPaymentId('real-id')).toBeNull();
  });
});
