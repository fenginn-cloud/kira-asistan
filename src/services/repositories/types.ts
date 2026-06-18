import type {
  AppUser,
  Company,
  Contract,
  Payment,
  PaymentMethod,
  PaymentTransaction,
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
}

export interface UserRepository {
  list(): Promise<AppUser[]>;
  create(input: Omit<AppUser, 'id' | 'createdAt'>): Promise<AppUser>;
  update(id: string, patch: Partial<AppUser>): Promise<AppUser>;
}

export interface CompanyRepository {
  getCurrent(): Promise<Company>;
  update(patch: Partial<Company>): Promise<Company>;
}

export interface Repositories {
  contracts: ContractRepository;
  payments: PaymentRepository;
  users: UserRepository;
  company: CompanyRepository;
}
