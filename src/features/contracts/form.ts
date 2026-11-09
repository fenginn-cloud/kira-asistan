import type { Contract } from '@/types';
import { normalizeBlock } from '@/lib/utils/block';
import type { ContractFormValues } from './schema';
import { monthStart } from '@/lib/ledger/accrual';

export const emptyContractForm: ContractFormValues = {
  propertyName: '',
  block: '',
  unit: '',
  tenantName: '',
  tenantPhone: '',
  tenantNationalId: '',
  ownerName: '',
  ownerPhone: '',
  rentAmount: 0,
  duesAmount: 0,
  depositAmount: 0,
  commissionAmount: 0,
  startDate: '',
  endDate: '',
  paymentDay: 1,
  notes: '',
  status: 'active',
  trackingStart: '',
  autoRenew: true,
  openingBalance: 0,
  rentEffectiveMonth: '',
  notifyOwner: true,
  notifyTenant: false,
  notifyStaff: true,
};

/**
 * Yeni sözleşmede önerilen takip başlangıcı: sözleşme gelecekte/bu ay
 * başlıyorsa başlangıç ayı; geçmişte başladıysa BU AY (bilinmeyen geçmiş aylar
 * otomatik borç yazılmaz — kullanıcı isterse daha eski bir ay seçer).
 */
export function suggestedTrackingStart(startDate: string, today = new Date()): string {
  if (!startDate) return monthStart(today);
  const start = monthStart(startDate);
  const cur = monthStart(today);
  return start >= cur ? start : cur;
}

export function contractToFormValues(c: Contract): ContractFormValues {
  return {
    propertyName: c.propertyName,
    block: c.block ?? '',
    unit: c.unit ?? '',
    tenantName: c.tenantName,
    tenantPhone: c.tenantPhone,
    tenantNationalId: c.tenantNationalId ?? '',
    ownerName: c.ownerName,
    ownerPhone: c.ownerPhone,
    rentAmount: c.rentAmount,
    duesAmount: c.duesAmount,
    depositAmount: c.depositAmount,
    commissionAmount: c.commissionAmount ?? 0,
    startDate: c.startDate,
    endDate: c.endDate ?? '',
    paymentDay: c.paymentDay,
    notes: c.notes ?? '',
    status: c.status,
    trackingStart: c.trackingStart ? monthStart(c.trackingStart) : monthStart(c.startDate),
    autoRenew: c.autoRenew ?? true,
    openingBalance: 0,
    rentEffectiveMonth: monthStart(new Date()),
    notifyOwner: c.notifyOwner,
    notifyTenant: c.notifyTenant,
    notifyStaff: c.notifyStaff,
  };
}

/** Maps validated form values to a contract create/update payload. */
export function formValuesToContractInput(
  values: ContractFormValues
): Omit<Contract, 'id' | 'createdAt' | 'companyId' | 'assignedUserId' | 'documentUrl'> {
  return {
    propertyName: values.propertyName,
    block: normalizeBlock(values.block) || null,
    unit: values.unit || null,
    tenantName: values.tenantName,
    tenantPhone: values.tenantPhone,
    tenantNationalId: values.tenantNationalId || null,
    ownerName: values.ownerName,
    ownerPhone: values.ownerPhone,
    rentAmount: values.rentAmount,
    duesAmount: values.duesAmount,
    depositAmount: values.depositAmount,
    commissionAmount: values.commissionAmount,
    startDate: values.startDate,
    endDate: values.endDate || null,
    paymentDay: values.paymentDay,
    notes: values.notes || null,
    status: values.status,
    trackingStart: values.trackingStart || suggestedTrackingStart(values.startDate),
    autoRenew: values.autoRenew,
    notifyOwner: values.notifyOwner,
    notifyTenant: values.notifyTenant,
    notifyStaff: values.notifyStaff,
  };
}
