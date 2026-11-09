/**
 * Tahsilat ve yaşam döngüsü akışları — DEMO (bellek içi) repository üzerinde.
 * Bu testler uygulama mantığını doğrular; gerçek Supabase sunucusunu DEĞİL.
 * Sunucu tarafı aynı kurallar supabase/tests/0023_lifecycle_test.sql ile yerel
 * PostgreSQL'de ayrıca test edilir.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Contract } from '@/types';

vi.useFakeTimers({ toFake: ['Date'] });
vi.setSystemTime(new Date(2026, 6, 20, 12)); // 20 Temmuz 2026

const { mockRepositories: repo } = await import('./index');

afterAll(() => vi.useRealTimers());

let c: Contract;

async function payments() {
  return repo.payments.listByContract(c.id);
}
async function month(period: string) {
  return (await payments()).find((p) => p.periodMonth === period);
}
async function debt() {
  return (await payments()).reduce(
    (s, p) => s + (p.dueDate < '2026-07-20' ? Math.max(p.amountDue - p.amountPaid, 0) : 0),
    0
  );
}

beforeAll(async () => {
  c = await repo.contracts.create({
    companyId: 'co_1',
    assignedUserId: null,
    propertyName: 'Test Apt',
    block: 'A',
    unit: '1',
    tenantName: 'Test Kiracı',
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
  });
}, 20_000);

describe('tahsilat akışları (demo repository)', () => {
  it('görüntüleme yazmaz: iki kez okumak aynı sonucu verir, kayıt oluşmaz', async () => {
    const a = await payments();
    const b = await payments();
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(a.every((p) => p.virtual)).toBe(true);
    expect(await debt()).toBe(30000); // Mayıs, Haziran, Temmuz
  });

  it('tam ödeme: seçilen ay (Mayıs) birebir kapanır', async () => {
    const may = await month('2026-05-01');
    await repo.payments.collect({
      paymentId: may!.id, amount: 10000, paidAt: '2026-07-20', method: null,
      description: null, receiptUrl: null, clientRef: 'ref-full',
    });
    const after = await month('2026-05-01');
    expect(after?.amountPaid).toBe(10000);
    expect(after?.virtual).toBeUndefined();
    expect(await debt()).toBe(20000);
  });

  it('kısmi ödeme: Haziran için 4.000 → 6.000 kalır', async () => {
    const jun = await month('2026-06-01');
    await repo.payments.collect({
      paymentId: jun!.id, amount: 4000, paidAt: '2026-07-20', method: 'cash',
      description: null, receiptUrl: null, clientRef: 'ref-partial',
    });
    const after = await month('2026-06-01');
    expect(after!.amountDue - after!.amountPaid).toBe(6000);
  });

  it('çift tıklama / ağ tekrarı: aynı clientRef ikinci kayıt oluşturmaz', async () => {
    const jul = await month('2026-07-01');
    const input = {
      paymentId: jul!.id, amount: 10000, paidAt: '2026-07-20', method: null,
      description: null, receiptUrl: null, clientRef: 'ref-dup',
    } as const;
    const [r1, r2] = await Promise.all([repo.payments.collect(input), repo.payments.collect(input)]);
    // Bağlantı tekrarı: ay artık gerçek satır; yine aynı anahtar.
    const r3 = await repo.payments.collect({ ...input, paymentId: (await month('2026-07-01'))!.id });
    expect(r2.transactionId).toBe(r1.transactionId);
    expect(r3.transactionId).toBe(r1.transactionId);
    const jul2 = await month('2026-07-01');
    expect(await repo.payments.listTransactions(jul2!.id)).toHaveLength(1);
    expect(jul2!.amountPaid).toBe(10000);
  });

  it('geri alma: son tahsilat silinince ay tekrar açılır', async () => {
    const jul = await month('2026-07-01');
    const tx = (await repo.payments.listTransactions(jul!.id))[0];
    await repo.payments.deleteTransaction(tx!.id);
    expect((await month('2026-07-01'))!.amountPaid).toBe(0);
  });

  it('geçmiş aya ödeme: en eski açık ay Haziran (kısmi) olarak kalır', async () => {
    const { defaultCollectionMonth } = await import('@/lib/ledger/accrual');
    expect(defaultCollectionMonth(await payments())?.periodMonth).toBe('2026-06-01');
  });

  it('ayı sıfırlama yalnızca o ayın tahsilatlarını siler', async () => {
    const jun = await month('2026-06-01');
    await repo.payments.resetMonth(jun!.id);
    expect((await month('2026-06-01'))!.amountPaid).toBe(0);
    expect((await month('2026-05-01'))!.amountPaid).toBe(10000);
  });
});

describe('yaşam döngüsü (demo repository)', () => {
  it('kira artışı (Ağustos): geçmiş aylar ve tahsilatlar korunur', async () => {
    await repo.contracts.applyRentChange(c.id, {
      effectiveMonth: '2026-08-01', rentAmount: 12000, duesAmount: 0,
    });
    c = (await repo.contracts.getById(c.id))!;
    expect(c.rentAmount).toBe(10000);
    expect(c.nextRentFrom).toBe('2026-08-01');
    expect((await month('2026-05-01'))!.amountPaid).toBe(10000);
    expect((await month('2026-07-01'))!.amountDue).toBe(10000);
    expect((await month('2026-08-01'))!.amountDue).toBe(12000);
  });

  it('bu aydan geçerli kira artışı: önceki aylar eski tutarda donar', async () => {
    await repo.contracts.applyRentChange(c.id, {
      effectiveMonth: '2026-07-01', rentAmount: 11000, duesAmount: 0,
    });
    c = (await repo.contracts.getById(c.id))!;
    expect(c.rentAmount).toBe(11000);
    expect(c.nextRentFrom).toBeNull();
    expect((await month('2026-06-01'))!.amountDue).toBe(10000);
    expect((await month('2026-07-01'))!.amountDue).toBe(11000);
  });

  it('uzatma: yeni bitiş tarihi, takip kesintisiz', async () => {
    c = await repo.contracts.update(c.id, { endDate: '2027-06-30', autoRenew: true });
    const { contractPhase } = await import('@/lib/ledger/accrual');
    expect(contractPhase(c)).toBe('active');
    expect(await month('2026-08-01')).toBeTruthy();
  });

  it('kiracı çıkışı: depozito kaydı, çıkış sonrası borç yok, geçmiş borç tahsil edilebilir', async () => {
    await repo.contracts.terminate(c.id, {
      exitDate: '2026-07-10', depositReturned: 15000, depositDeduction: 5000, depositNote: 'Boya',
    });
    c = (await repo.contracts.getById(c.id))!;
    expect(c.status).toBe('terminated');
    expect(c.depositDeduction).toBe(5000);
    const list = await payments();
    expect(list.some((p) => p.periodMonth === '2026-08-01')).toBe(false);
    const jun = list.find((p) => p.periodMonth === '2026-06-01');
    await repo.payments.collect({
      paymentId: jun!.id, amount: 10000, paidAt: '2026-07-20', method: null,
      description: null, receiptUrl: null, clientRef: 'ref-after-exit',
    });
    expect((await month('2026-06-01'))!.amountPaid).toBe(10000);
  });
});
