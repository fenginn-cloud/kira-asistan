import { z } from 'zod';

const requiredString = (msg: string) => z.string().trim().min(1, msg);

const numberFromInput = (msg: string) =>
  z.coerce.number({ invalid_type_error: msg }).min(0, msg);

export const contractFormSchema = z.object({
  propertyName: requiredString('Mülk adı zorunludur'),
  block: z.string().trim().optional().default(''),
  unit: z.string().trim().optional().default(''),

  tenantName: requiredString('Kiracı adı zorunludur'),
  tenantPhone: requiredString('Kiracı telefonu zorunludur'),
  tenantNationalId: z.string().trim().optional().default(''),

  ownerName: requiredString('Mülk sahibi zorunludur'),
  ownerPhone: requiredString('Mülk sahibi telefonu zorunludur'),

  rentAmount: numberFromInput('Geçerli bir kira bedeli girin'),
  duesAmount: numberFromInput('Geçerli bir aidat girin'),
  depositAmount: numberFromInput('Geçerli bir depozito girin'),
  commissionAmount: numberFromInput('Geçerli bir komisyon girin').default(0),

  startDate: requiredString('Başlangıç tarihi zorunludur'),
  endDate: z.string().trim().optional().default(''),
  paymentDay: z.coerce
    .number({ invalid_type_error: 'Ödeme günü 1-31 arası olmalı' })
    .int()
    .min(1, 'Ödeme günü 1-31 arası olmalı')
    .max(31, 'Ödeme günü 1-31 arası olmalı'),

  notes: z.string().trim().optional().default(''),
  status: z.enum(['active', 'passive', 'terminated']).default('active'),

  /** Takip başlangıç ayı (YYYY-MM-01). Boş → başlangıç ayı. */
  trackingStart: z.string().trim().optional().default(''),
  /** Bitişte aynı koşullarla takibe devam. */
  autoRenew: z.boolean().default(true),
  /** Yalnızca yeni sözleşmede: takip öncesinden devreden borç. */
  openingBalance: z.coerce.number().min(0, 'Geçerli bir tutar girin').default(0),
  /** Düzenlemede kira değişirse: yeni tutarın geçerli olacağı ay. */
  rentEffectiveMonth: z.string().trim().optional().default(''),

  notifyOwner: z.boolean().default(true),
  notifyTenant: z.boolean().default(false),
  notifyStaff: z.boolean().default(true),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;
