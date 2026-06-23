import type {
  AppUser,
  Company,
  Contract,
  Payment,
  PaymentMethod,
  PaymentTransaction,
  TenantClaim,
} from '@/types';

/**
 * Repository contract. The mock implementation backs Phase 1; a Supabase
 * implementation will satisfy the same interface in Phase 2 with zero changes
 * to the feature hooks that consume it.
 */
export interface ContractRepository {
  list(): Promise<Contract[]>;
  getById(id: string): Promise<Contract | null>;
  create(input: Omit<Contract, 'id' | 'createdAt'>): Promise<Contract>;
  update(id: string, patch: Partial<Contract>): Promise<Contract>;
  remove(id: string): Promise<void>;
  /** Tenant-link token. Returns null if unavailable (e.g. migration not yet applied). */
  getPublicToken(id: string): Promise<string | null>;
}

export interface PaymentRepository {
  listByContract(contractId: string): Promise<Payment[]>;
  listAll(): Promise<Payment[]>;
  addTransaction(input: {
    paymentId: string;
    amount: number;
    paidAt: string;
    method: PaymentMethod | null;
    description: string | null;
    receiptUrl: string | null;
  }): Promise<Payment>;
  listTransactions(paymentId: string): Promise<PaymentTransaction[]>;
  listTransactionsByContract(contractId: string): Promise<PaymentTransaction[]>;
  /** Delete a single collection; the ledger recomputes automatically. */
  deleteTransaction(id: string): Promise<void>;
  /**
   * Manually set a month's collected amount (correction / undo). Clears any
   * backing transactions first, then sets amount_paid + status directly.
   * amountPaid = 0 → "Ödenmedi"; = amountDue → "Ödendi".
   */
  setMonthlyPaid(paymentId: string, amountPaid: number): Promise<void>;
  /** Create any missing payment rows for the contract's recent months. */
  ensureRecentPayments(contract: Contract): Promise<void>;
}

export interface CreateUserInput extends Omit<AppUser, 'id' | 'createdAt'> {
  /** Initial password for the new user's auth account. */
  password: string;
}

export interface UserRepository {
  list(): Promise<AppUser[]>;
  create(input: CreateUserInput): Promise<AppUser>;
  update(id: string, patch: Partial<AppUser>): Promise<AppUser>;
}

export interface CompanyRepository {
  getCurrent(): Promise<Company>;
  update(patch: Partial<Company>): Promise<Company>;
}

export interface ClaimsRepository {
  /** Tenant-reported payments awaiting owner approval (newest first). */
  listPending(): Promise<TenantClaim[]>;
  /** Approve: record the payment into the ledger + mark the claim approved. */
  approve(claim: TenantClaim, contract: Contract): Promise<void>;
  reject(id: string): Promise<void>;
}

export interface Repositories {
  contracts: ContractRepository;
  payments: PaymentRepository;
  users: UserRepository;
  company: CompanyRepository;
  claims: ClaimsRepository;
}
