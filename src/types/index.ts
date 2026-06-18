/**
 * Domain types for Kira Asistan.
 * These mirror the Supabase schema (see supabase/migrations) so the
 * mock-data layer and the future API layer stay interchangeable.
 */

export type UserRole = 'super_admin' | 'admin' | 'personnel';

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  logoUrl: string | null;
  currency: string;
  defaultNotificationDays: number[];
  createdAt: string;
}

export interface AppUser {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export type ContractStatus = 'active' | 'passive' | 'terminated';

export interface Contract {
  id: string;
  companyId: string;
  assignedUserId: string | null;

  propertyName: string;
  block: string | null;
  unit: string | null;

  tenantName: string;
  tenantPhone: string;
  tenantNationalId: string | null;

  ownerName: string;
  ownerPhone: string;

  rentAmount: number;
  duesAmount: number;
  depositAmount: number;

  startDate: string; // ISO date
  endDate: string | null;
  paymentDay: number; // 1-31

  notes: string | null;
  status: ContractStatus;
  documentUrl: string | null;

  /** Per-contract notification channel switches. */
  notifyOwner: boolean;
  notifyTenant: boolean;
  notifyStaff: boolean;

  createdAt: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'overdue';

export interface Payment {
  id: string;
  contractId: string;
  /** The month this payment covers, normalized to the first day: YYYY-MM-01 */
  periodMonth: string;
  dueDate: string; // ISO date
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  paidAt: string | null;
  note: string | null;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'other';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Nakit',
  transfer: 'Havale / EFT',
  card: 'Kredi Kartı',
  other: 'Diğer',
};

/** A single tranche logged against a payment period. */
export interface PaymentTransaction {
  id: string;
  paymentId: string;
  amount: number;
  paidAt: string;
  method: PaymentMethod | null;
  description: string | null;
  receiptUrl: string | null;
}

export type NotificationTrigger =
  | 'before_7'
  | 'before_3'
  | 'before_1'
  | 'due_day'
  | 'overdue_1'
  | 'overdue_3'
  | 'overdue_7';

export interface NotificationPreferences {
  before_7: boolean;
  before_3: boolean;
  before_1: boolean;
  due_day: boolean;
  overdue_1: boolean;
  overdue_3: boolean;
  overdue_7: boolean;
}

export type ThemePreference = 'light' | 'dark' | 'system';

/** A reminder that is due to be sent (computed from contracts + payments). */
export interface Reminder {
  /** Stable key: `${contractId}:${periodMonth}:${trigger}` */
  id: string;
  contractId: string;
  paymentId: string;
  trigger: NotificationTrigger;
  /** Negative = overdue, positive = days remaining, 0 = due today. */
  daysUntil: number;
  kind: 'upcoming' | 'overdue';
}

export type MessageKind = 'upcoming' | 'overdue';
