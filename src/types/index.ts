/**
 * Domain types for Kira Asistan.
 * These mirror the Supabase schema (see supabase/migrations) so the
 * mock-data layer and the future API layer stay interchangeable.
 */

export type UserRole = 'super_admin' | 'admin' | 'personnel';

export type PlanId = 'free' | 'pro' | 'business';
export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'legacy';

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
  /** Subscription / entitlement (company-level). */
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  isLegacy: boolean;
  entitlementType: string | null;
  currentPeriodEnd: string | null;
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
  /** Kiracı girişinde alınan komisyon (bir kerelik). Yoksa 0. */
  commissionAmount?: number;

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

  /** Tenant self-service link token (/k/<token>). Absent in mock mode. */
  publicToken?: string | null;

  /** Kısa hızlı not — kartlarda görünür (ör. "10 gün sonra ödeyecek"). */
  cardNote?: string | null;

  createdAt: string;
}

/** A payment the tenant reported via their link, pending owner approval. */
export interface TenantClaim {
  id: string;
  contractId: string;
  periodMonth: string;
  amount: number;
  note: string | null;
  receiptUrl: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  /** Joined for display (may be absent). */
  tenantName?: string;
  propertyName?: string;
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

// ---------------------------------------------------------------------------
// Kiracı Bilgi Formu (tenant information form)
// ---------------------------------------------------------------------------

export type TenantFormStatus = 'pending' | 'completed' | 'reviewed' | 'expired';
export type TenantFormResult = 'suitable' | 'need_docs' | 'unsuitable' | 'unrated';

/** One vehicle the tenant declares (step 2). */
export interface TenantFormVehicle {
  plate: string;
  brandModel?: string;
}

/**
 * All answers the tenant fills in on the public form, grouped by step.
 * Stored as JSONB so the form structure can evolve without a migration.
 */
export interface TenantFormResponses {
  personal?: Record<string, unknown>;
  hasVehicle?: boolean;
  vehicles?: TenantFormVehicle[];
  emergency?: Record<string, unknown>;
  employment?: Record<string, unknown>;
  previousRental?: Record<string, unknown>;
  moving?: Record<string, unknown>;
  reference?: Record<string, unknown>;
  rentalRequest?: Record<string, unknown>;
  declaration?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface TenantFormDocument {
  id: string;
  formId: string;
  documentType: string | null;
  fileName: string | null;
  storagePath: string;
  createdAt: string;
}

export interface TenantFormReview {
  id: string;
  formId: string;
  reviewerId: string | null;
  generalNote: string | null;
  incomeRentRatio: number | null;
  landlordReference: string | null;
  incomeVerification: string | null;
  additionalNotes: string | null;
  result: TenantFormResult;
  createdAt: string;
  updatedAt: string;
}

export interface TenantForm {
  id: string;
  companyId: string;
  contractId: string | null;
  createdBy: string | null;
  token: string;
  status: TenantFormStatus;
  expiresAt: string | null;
  submittedAt: string | null;
  tenantName: string | null;
  tenantPhone: string | null;
  tenantEmail: string | null;
  responses: TenantFormResponses;
  createdAt: string;
  updatedAt: string;
  /** Joined for detail view (optional). */
  documents?: TenantFormDocument[];
  review?: TenantFormReview | null;
  /** Lightweight review result for list cards (joined in list query). */
  reviewResult?: TenantFormResult | null;
  /** Joined property name if linked to a contract. */
  propertyName?: string | null;
}
