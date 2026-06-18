/**
 * Row <-> domain mappers. DB is snake_case; the app is camelCase.
 * Keeping this in one place means the rest of the app never sees DB shapes.
 */
import type {
  AppUser,
  Company,
  Contract,
  Payment,
  PaymentTransaction,
} from '@/types';

export const contractColumns =
  'id, company_id, assigned_user_id, property_name, block, unit, tenant_name, tenant_phone, tenant_national_id, owner_name, owner_phone, rent_amount, dues_amount, deposit_amount, start_date, end_date, payment_day, notes, status, document_url, notify_owner, notify_tenant, notify_staff, created_at';

export function toContract(r: any): Contract {
  return {
    id: r.id,
    companyId: r.company_id,
    assignedUserId: r.assigned_user_id,
    propertyName: r.property_name,
    block: r.block,
    unit: r.unit,
    tenantName: r.tenant_name,
    tenantPhone: r.tenant_phone,
    tenantNationalId: r.tenant_national_id,
    ownerName: r.owner_name,
    ownerPhone: r.owner_phone,
    rentAmount: Number(r.rent_amount),
    duesAmount: Number(r.dues_amount),
    depositAmount: Number(r.deposit_amount),
    startDate: r.start_date,
    endDate: r.end_date,
    paymentDay: r.payment_day,
    notes: r.notes,
    status: r.status,
    documentUrl: r.document_url,
    notifyOwner: r.notify_owner,
    notifyTenant: r.notify_tenant,
    notifyStaff: r.notify_staff,
    createdAt: r.created_at,
  };
}

export function fromContract(c: Partial<Contract>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) out[k] = v;
  };
  set('company_id', c.companyId);
  set('assigned_user_id', c.assignedUserId);
  set('property_name', c.propertyName);
  set('block', c.block);
  set('unit', c.unit);
  set('tenant_name', c.tenantName);
  set('tenant_phone', c.tenantPhone);
  set('tenant_national_id', c.tenantNationalId);
  set('owner_name', c.ownerName);
  set('owner_phone', c.ownerPhone);
  set('rent_amount', c.rentAmount);
  set('dues_amount', c.duesAmount);
  set('deposit_amount', c.depositAmount);
  set('start_date', c.startDate);
  set('end_date', c.endDate);
  set('payment_day', c.paymentDay);
  set('notes', c.notes);
  set('status', c.status);
  set('document_url', c.documentUrl);
  set('notify_owner', c.notifyOwner);
  set('notify_tenant', c.notifyTenant);
  set('notify_staff', c.notifyStaff);
  return out;
}

export function toPayment(r: any): Payment {
  return {
    id: r.id,
    contractId: r.contract_id,
    periodMonth: r.period_month,
    dueDate: r.due_date,
    amountDue: Number(r.amount_due),
    amountPaid: Number(r.amount_paid),
    status: r.status,
    paidAt: r.paid_at,
    note: r.note,
  };
}

export function toTransaction(r: any): PaymentTransaction {
  return {
    id: r.id,
    paymentId: r.payment_id,
    amount: Number(r.amount),
    paidAt: r.paid_at,
    method: r.method,
    description: r.description,
    receiptUrl: r.receipt_url,
  };
}

export function toUser(r: any): AppUser {
  return {
    id: r.id,
    companyId: r.company_id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    isActive: r.is_active,
    phone: r.phone,
    avatarUrl: r.avatar_url,
    lastLoginAt: r.last_login_at,
    createdAt: r.created_at,
  };
}

export function fromUser(u: Partial<AppUser>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) out[k] = v;
  };
  set('company_id', u.companyId);
  set('email', u.email);
  set('full_name', u.fullName);
  set('role', u.role);
  set('is_active', u.isActive);
  set('phone', u.phone);
  set('avatar_url', u.avatarUrl);
  set('last_login_at', u.lastLoginAt);
  return out;
}

export function toCompany(r: any): Company {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    address: r.address,
    taxOffice: r.tax_office,
    taxNumber: r.tax_number,
    logoUrl: r.logo_url,
    currency: r.currency,
    defaultNotificationDays: r.default_notification_days ?? [],
    createdAt: r.created_at,
  };
}

export function fromCompany(c: Partial<Company>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (k: string, v: unknown) => {
    if (v !== undefined) out[k] = v;
  };
  set('name', c.name);
  set('phone', c.phone);
  set('email', c.email);
  set('address', c.address);
  set('tax_office', c.taxOffice);
  set('tax_number', c.taxNumber);
  set('logo_url', c.logoUrl);
  set('currency', c.currency);
  set('default_notification_days', c.defaultNotificationDays);
  return out;
}
