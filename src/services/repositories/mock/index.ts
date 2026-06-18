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
import { derivePaymentStatus } from '@/lib/utils/payments';
import type { Repositories } from '../types';

// In-memory stores (cloned so we can mutate without touching the seed data).
let contracts: Contract[] = structuredClone(mockContracts);
let payments: Payment[] = structuredClone(mockPayments);
let transactions: PaymentTransaction[] = structuredClone(mockTransactions);
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
  },

  payments: {
    listByContract: (contractId) =>
      delay(
        payments
          .filter((p) => p.contractId === contractId)
          .map(normalizeStatus)
          .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))
      ),
    listAll: () => delay(payments.map(normalizeStatus)),
    addTransaction: (input) => {
      const tx: PaymentTransaction = { ...input, id: uid('t') };
      transactions = [tx, ...transactions];
      payments = payments.map((p) =>
        p.id === input.paymentId
          ? {
              ...p,
              amountPaid: p.amountPaid + input.amount,
              paidAt: input.paidAt,
            }
          : p
      );
      const updated = payments.find((p) => p.id === input.paymentId);
      if (!updated) throw new Error('Ödeme bulunamadı');
      return delay(normalizeStatus(updated));
    },
    listTransactions: (paymentId) =>
      delay(transactions.filter((t) => t.paymentId === paymentId)),
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
};

function normalizeStatus(p: Payment): Payment {
  return { ...p, status: derivePaymentStatus(p) };
}
