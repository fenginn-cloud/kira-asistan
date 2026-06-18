import type { Contract } from '@/types';
import type { ContractFormValues } from './schema';

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
  startDate: '',
  endDate: '',
  paymentDay: 1,
  notes: '',
  status: 'active',
  notifyOwner: true,
  notifyTenant: false,
  notifyStaff: true,
};

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
    startDate: c.startDate,
    endDate: c.endDate ?? '',
    paymentDay: c.paymentDay,
    notes: c.notes ?? '',
    status: c.status,
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
    block: values.block || null,
    unit: values.unit || null,
    tenantName: values.tenantName,
    tenantPhone: values.tenantPhone,
    tenantNationalId: values.tenantNationalId || null,
    ownerName: values.ownerName,
    ownerPhone: values.ownerPhone,
    rentAmount: values.rentAmount,
    duesAmount: values.duesAmount,
    depositAmount: values.depositAmount,
    startDate: values.startDate,
    endDate: values.endDate || null,
    paymentDay: values.paymentDay,
    notes: values.notes || null,
    status: values.status,
    notifyOwner: values.notifyOwner,
    notifyTenant: values.notifyTenant,
    notifyStaff: values.notifyStaff,
  };
}
