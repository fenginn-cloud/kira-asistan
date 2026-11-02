import {
  mockCompany,
  mockContracts,
  mockPayments,
  mockTransactions,
  mockUsers,
} from '@/data/mock';
import type {
  AppUser,
  Company,
  Contract,
  Payment,
  PaymentTransaction,
} from '@/types';
import { addMonths, format, parseISO } from 'date-fns';
import { derivePaymentStatus } from '@/lib/utils/payments';
import {
  amountForMonth,
  dueDateFor,
  monthStart,
  parseVirtualPaymentId,
  trackingStartMonth,
  withExpectedPayments,
  withExpectedPaymentsAll,
} from '@/lib/ledger/accrual';
import type { DeviceSession, RentChangeInput, Repositories, Unit } from '../types';

type MockTx = PaymentTransaction & { clientRef?: string };

// In-memory stores (cloned so we can mutate without touching the seed data).
let payments: Payment[] = structuredClone(mockPayments);
/**
 * Migration 0023 ile AYNI varsayılanlar: takip başlangıcı = en eski kayıtlı ay
 * (yoksa oluşturulma ayı); bitişi geçmiş sözleşmede autoRenew=false.
 */
let contracts: Contract[] = structuredClone(mockContracts).map((c) => {
  const own = payments.filter((p) => p.contractId === c.id).map((p) => p.periodMonth).sort();
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...c,
    trackingStart: c.trackingStart ?? own[0] ?? monthStart(c.createdAt),
    autoRenew: c.autoRenew ?? !(c.endDate && c.endDate < today),
    // Migration 0023 gibi: eski sonlandırılmış sözleşmeye çıkış tarihi yazılmaz.
    terminatedAt: c.terminatedAt ?? null,
  };
});
let buildingUnits: { building: string; total: number }[] = [];
let units: Unit[] = [];
let deviceSessions: DeviceSession[] = [];
let transactions: MockTx[] = structuredClone(mockTransactions);
let users: AppUser[] = structuredClone(mockUsers);
let company: Company = structuredClone(mockCompany);

/** Simulate network latency so loading/skeleton states are exercised. */
const delay = <T>(value: T, ms = 350): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const mockRepositories: Repositories = {
  contracts: {
    list: () => delay(structuredClone(contracts)),
    getById: (id) => delay(contracts.find((c) => c.id === id) ?? null),
    create: (input) => {
      const contract: Contract = {
        ...input,
        id: uid('c'),
        createdAt: new Date().toISOString(),
      };
      contracts = [contract, ...contracts];
      return delay(contract);
    },
    update: (id, patch) => {
      contracts = contracts.map((c) => (c.id === id ? { ...c, ...patch } : c));
      const updated = contracts.find((c) => c.id === id);
      if (!updated) throw new Error('Sözleşme bulunamadı');
      return delay(updated);
    },
    remove: (id) => {
      contracts = contracts.filter((c) => c.id !== id);
      return delay(undefined);
    },
    getPublicToken: () => delay(null),
    applyRentChange: (id, input) => {
      const c = contracts.find((x) => x.id === id);
      if (!c) throw new Error('Sözleşme bulunamadı');
      applyRentChangeInMemory(c, input);
      return delay(undefined);
    },
    terminate: (id, input) => {
      contracts = contracts.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'terminated',
              terminatedAt: input.exitDate,
              depositReturned: input.depositReturned,
              depositDeduction: input.depositDeduction,
              depositNote: input.depositNote?.trim() || null,
            }
          : c
      );
      return delay(undefined);
    },
  },

  payments: {
    listByContract: (contractId) => {
      const c = contracts.find((x) => x.id === contractId);
      const stored = payments.filter((p) => p.contractId === contractId).map(normalizeStatus);
      const all = c ? withExpectedPayments(c, stored) : stored;
      return delay(all.sort((a, b) => b.periodMonth.localeCompare(a.periodMonth)));
    },
    listAll: () => delay(withExpectedPaymentsAll(contracts, payments.map(normalizeStatus))),
    collect: (input) => {
      if (!(input.amount > 0)) throw new Error('Tutar sıfırdan büyük olmalı');
      const existing = transactions.find((t) => t.clientRef === input.clientRef);
      if (existing) return delay({ transactionId: existing.id });
      const paymentId = materialize(input.paymentId);
      const tx: MockTx = {
        id: uid('t'),
        paymentId,
        amount: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        description: input.description,
        receiptUrl: input.receiptUrl,
        clientRef: input.clientRef,
      };
      transactions = [tx, ...transactions];
      recalc(paymentId);
      return delay({ transactionId: tx.id });
    },
    listTransactions: (paymentId) =>
      delay(transactions.filter((t) => t.paymentId === paymentId)),
    deleteTransaction: (id) => {
      const tx = transactions.find((t) => t.id === id);
      transactions = transactions.filter((t) => t.id !== id);
      if (tx) recalc(tx.paymentId);
      return delay(undefined);
    },
    syncPaidMonth: ({ contractId, periodMonth, amountDue }) => {
      const existing = payments.find(
        (p) => p.contractId === contractId && p.periodMonth === periodMonth
      );
      const today = new Date().toISOString().slice(0, 10);
      if (existing) {
        payments = payments.map((p) =>
          p.id === existing.id
            ? { ...p, amountPaid: Math.max(p.amountPaid, p.amountDue || amountDue), status: 'paid', paidAt: p.paidAt ?? today }
            : p
        );
      } else {
        payments = [
          ...payments,
          { id: uid('p'), contractId, periodMonth, dueDate: periodMonth, amountDue, amountPaid: amountDue, status: 'paid', paidAt: today, note: null },
        ];
      }
      return delay(undefined);
    },
    resetMonth: (paymentId) => {
      transactions = transactions.filter((t) => t.paymentId !== paymentId);
      payments = payments.map((p) =>
        p.id === paymentId ? { ...p, amountPaid: 0, paidAt: null } : p
      );
      return delay(undefined);
    },
    addOpeningBalance: (contract, amount) => {
      if (amount > 0) {
        const period = format(addMonths(parseISO(trackingStartMonth(contract)), -1), 'yyyy-MM-dd');
        if (!payments.some((p) => p.contractId === contract.id && p.periodMonth === period)) {
          payments = [
            ...payments,
            {
              id: uid('p'),
              contractId: contract.id,
              periodMonth: period,
              dueDate: period,
              amountDue: amount,
              amountPaid: 0,
              status: 'overdue',
              paidAt: null,
              note: 'Başlangıç bakiyesi (takip öncesinden devreden)',
              kind: 'opening',
            },
          ];
        }
      }
      return delay(undefined);
    },
    listTransactionsByContract: (contractId) => {
      const ids = new Set(
        payments.filter((p) => p.contractId === contractId).map((p) => p.id)
      );
      return delay(
        transactions
          .filter((t) => ids.has(t.paymentId))
          .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
      );
    },
  },

  claims: {
    // Tenant portal is a live-only (Supabase) feature.
    listPending: () => delay([]),
    approve: () => delay(undefined),
    reject: () => delay(undefined),
  },

  users: {
    list: () => delay(structuredClone(users)),
    create: ({ password: _password, ...input }) => {
      const user: AppUser = {
        ...input,
        id: uid('u'),
        createdAt: new Date().toISOString(),
      };
      users = [...users, user];
      return delay(user);
    },
    update: (id, patch) => {
      users = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
      const updated = users.find((u) => u.id === id);
      if (!updated) throw new Error('Kullanıcı bulunamadı');
      return delay(updated);
    },
  },

  company: {
    getCurrent: () => delay(structuredClone(company)),
    update: (patch) => {
      company = { ...company, ...patch };
      return delay(structuredClone(company));
    },
  },

  buildingUnits: {
    list: () => delay(buildingUnits.map((b) => ({ ...b }))),
    set: (building, total) => {
      const i = buildingUnits.findIndex((b) => b.building === building);
      if (i >= 0) buildingUnits[i] = { building, total };
      else buildingUnits.push({ building, total });
      return delay(undefined);
    },
  },

  units: {
    list: () => delay(units.map((u) => ({ ...u }))),
    upsert: (input) => {
      const block = input.block ?? '';
      const existing = units.find(
        (u) => u.building === input.building && u.block === block && u.unitLabel === input.unitLabel
      );
      // Çakışırsa mevcut korunur ("isimler çakışıyorsa kalsın").
      if (existing) return delay({ ...existing });
      const unit: Unit = {
        id: uid('u'),
        building: input.building,
        block,
        unitLabel: input.unitLabel,
        status: input.status ?? 'vacant',
        vacantSince: input.vacantSince ?? null,
        note: input.note ?? null,
        areaM2: null,
        layout: null,
        balcony: false,
        terrace: false,
        fixtures: [],
      };
      units.push(unit);
      return delay({ ...unit });
    },
    setStatus: (id, status, vacantSince) => {
      const u = units.find((x) => x.id === id);
      if (u) {
        u.status = status;
        u.vacantSince =
          status === 'vacant' ? vacantSince ?? new Date().toISOString().slice(0, 10) : null;
      }
      return delay(undefined);
    },
    updateDetails: (id, details) => {
      const u = units.find((x) => x.id === id);
      if (u) {
        u.areaM2 = details.areaM2;
        u.layout = details.layout;
        u.balcony = details.balcony;
        u.terrace = details.terrace;
        u.fixtures = details.fixtures;
        u.note = details.note;
      }
      return delay(undefined);
    },
    remove: (id) => {
      units = units.filter((x) => x.id !== id);
      return delay(undefined);
    },
  },

  deviceSessions: {
    list: () =>
      delay(
        [...deviceSessions].sort((a, b) => b.lastActive.localeCompare(a.lastActive)).map((d) => ({ ...d }))
      ),
    register: (input) => {
      const now = new Date().toISOString();
      const existing = deviceSessions.find((d) => d.deviceToken === input.deviceToken);
      if (existing) {
        existing.label = input.label;
        existing.platform = input.platform;
        existing.lastActive = now;
        existing.revoked = false;
      } else {
        deviceSessions.push({
          id: uid('dev'),
          deviceToken: input.deviceToken,
          label: input.label,
          platform: input.platform,
          lastActive: now,
          revoked: false,
        });
      }
      return delay(undefined);
    },
    touch: (deviceToken) => {
      const d = deviceSessions.find((x) => x.deviceToken === deviceToken);
      if (d) d.lastActive = new Date().toISOString();
      return delay(undefined);
    },
    isRevoked: (deviceToken) =>
      delay(deviceSessions.find((x) => x.deviceToken === deviceToken)?.revoked ?? false),
    revoke: (id) => {
      const d = deviceSessions.find((x) => x.id === id);
      if (d) d.revoked = true;
      return delay(undefined);
    },
    remove: (id) => {
      deviceSessions = deviceSessions.filter((x) => x.id !== id);
      return delay(undefined);
    },
  },
};

/** Sanal ay → satır oluştur (DB'deki materializePayment ile aynı). */
function materialize(paymentId: string): string {
  const v = parseVirtualPaymentId(paymentId);
  if (!v) return paymentId;
  const existing = payments.find(
    (p) => p.contractId === v.contractId && p.periodMonth === v.periodMonth
  );
  if (existing) return existing.id;
  const c = contracts.find((x) => x.id === v.contractId);
  if (!c) throw new Error('Sözleşme bulunamadı');
  const row: Payment = {
    id: uid('p'),
    contractId: c.id,
    periodMonth: v.periodMonth,
    dueDate: dueDateFor(v.periodMonth, c.paymentDay),
    amountDue: amountForMonth(c, v.periodMonth),
    amountPaid: 0,
    status: 'pending',
    paidAt: null,
    note: null,
    kind: 'rent',
  };
  payments = [...payments, row];
  return row.id;
}

/** recalc_payment tetikleyicisinin karşılığı: amount_paid = tahsilat toplamı. */
function recalc(paymentId: string) {
  const own = transactions.filter((t) => t.paymentId === paymentId);
  const total = own.reduce((s, t) => s + t.amount, 0);
  const last = own.map((t) => t.paidAt).sort().pop() ?? null;
  payments = payments.map((p) =>
    p.id === paymentId ? { ...p, amountPaid: total, paidAt: total > 0 ? last : null } : p
  );
}

/** apply_rent_change (0023) ile aynı kurallar. */
function applyRentChangeInMemory(c: Contract, input: RentChangeInput) {
  const eff = monthStart(input.effectiveMonth);
  const cur = monthStart(new Date());
  const horizon = monthStart(addMonths(new Date(), 1));
  // Artıştan önceki ayları eski tutarla dondur.
  let m = trackingStartMonth(c);
  while (m < eff && m <= horizon) {
    materialize(`v:${c.id}:${m}`);
    m = monthStart(addMonths(parseISO(m), 1));
  }
  const patch: Partial<Contract> =
    eff <= cur
      ? {
          rentAmount: input.rentAmount,
          duesAmount: input.duesAmount,
          nextRentAmount: null,
          nextDuesAmount: null,
          nextRentFrom: null,
        }
      : {
          nextRentAmount: input.rentAmount,
          nextDuesAmount: input.duesAmount,
          nextRentFrom: eff,
        };
  contracts = contracts.map((x) => (x.id === c.id ? { ...x, ...patch } : x));
  payments = payments.map((p) =>
    p.contractId === c.id && p.kind !== 'opening' && p.periodMonth >= eff
      ? { ...p, amountDue: input.rentAmount + input.duesAmount }
      : p
  );
}

function normalizeStatus(p: Payment): Payment {
  return { ...p, status: derivePaymentStatus(p) };
}
