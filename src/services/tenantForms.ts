import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';
import type {
  TenantForm,
  TenantFormDocument,
  TenantFormResponses,
  TenantFormResult,
  TenantFormReview,
} from '@/types';

// ---------------------------------------------------------------------------
// Row mappers (snake_case DB → camelCase app)
// ---------------------------------------------------------------------------

function mapForm(row: any): TenantForm {
  return {
    id: row.id,
    companyId: row.company_id,
    contractId: row.contract_id ?? null,
    createdBy: row.created_by ?? null,
    token: row.token,
    status: row.status,
    expiresAt: row.expires_at ?? null,
    submittedAt: row.submitted_at ?? null,
    tenantName: row.tenant_name ?? null,
    tenantPhone: row.tenant_phone ?? null,
    tenantEmail: row.tenant_email ?? null,
    responses: (row.responses ?? {}) as TenantFormResponses,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propertyName: row.contracts?.property_name ?? null,
    reviewResult: Array.isArray(row.tenant_form_reviews)
      ? (row.tenant_form_reviews[0]?.result ?? null)
      : (row.tenant_form_reviews?.result ?? null),
  };
}

function mapReview(row: any): TenantFormReview {
  return {
    id: row.id,
    formId: row.form_id,
    reviewerId: row.reviewer_id ?? null,
    generalNote: row.general_note ?? null,
    incomeRentRatio: row.income_rent_ratio ?? null,
    landlordReference: row.landlord_reference ?? null,
    incomeVerification: row.income_verification ?? null,
    additionalNotes: row.additional_notes ?? null,
    result: row.result ?? 'unrated',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDoc(row: any): TenantFormDocument {
  return {
    id: row.id,
    formId: row.form_id,
    documentType: row.document_type ?? null,
    fileName: row.file_name ?? null,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

/** A form whose expiry has passed is surfaced as "expired" in the UI. */
function withExpiry(form: TenantForm): TenantForm {
  if (
    form.status === 'pending' &&
    form.expiresAt &&
    new Date(form.expiresAt).getTime() < Date.now()
  ) {
    return { ...form, status: 'expired' };
  }
  return form;
}

// ---------------------------------------------------------------------------
// Mock fallback (demo / screenshot mode — no Supabase configured)
// ---------------------------------------------------------------------------

let mockStore: TenantForm[] = [];
const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// ---------------------------------------------------------------------------
// Authenticated operations (RLS enforces company isolation)
// ---------------------------------------------------------------------------

export interface CreateFormInput {
  tenantName?: string;
  tenantPhone?: string;
  tenantEmail?: string;
  contractId?: string | null;
  expiresAt?: string | null;
}

export async function listForms(): Promise<TenantForm[]> {
  if (!supabase) return mockStore.map(withExpiry);
  const { data, error } = await supabase
    .from('tenant_forms')
    .select('*, contracts(property_name), tenant_form_reviews(result)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => withExpiry(mapForm(r)));
}

export async function getForm(id: string): Promise<TenantForm | null> {
  if (!supabase) {
    const f = mockStore.find((x) => x.id === id);
    return f ? withExpiry(f) : null;
  }
  const { data, error } = await supabase
    .from('tenant_forms')
    .select('*, contracts(property_name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const form = withExpiry(mapForm(data));

  const [{ data: docs }, { data: review }] = await Promise.all([
    supabase.from('tenant_form_documents').select('*').eq('form_id', id).order('created_at'),
    supabase.from('tenant_form_reviews').select('*').eq('form_id', id).maybeSingle(),
  ]);
  form.documents = (docs ?? []).map(mapDoc);
  form.review = review ? mapReview(review) : null;
  return form;
}

export async function createForm(input: CreateFormInput): Promise<TenantForm> {
  const user = useAuthStore.getState().user;
  if (!supabase) {
    const now = new Date().toISOString();
    const form: TenantForm = {
      id: uuid(),
      companyId: user?.companyId ?? 'mock',
      contractId: input.contractId ?? null,
      createdBy: user?.id ?? null,
      token: uuid(),
      status: 'pending',
      expiresAt: input.expiresAt ?? null,
      submittedAt: null,
      tenantName: input.tenantName ?? null,
      tenantPhone: input.tenantPhone ?? null,
      tenantEmail: input.tenantEmail ?? null,
      responses: {},
      createdAt: now,
      updatedAt: now,
    };
    mockStore = [form, ...mockStore];
    return form;
  }
  if (!user?.companyId) throw new Error('Oturum bulunamadı.');
  const { data, error } = await supabase
    .from('tenant_forms')
    .insert({
      company_id: user.companyId,
      created_by: user.id,
      contract_id: input.contractId ?? null,
      tenant_name: input.tenantName ?? null,
      tenant_phone: input.tenantPhone ?? null,
      tenant_email: input.tenantEmail ?? null,
      expires_at: input.expiresAt ?? null,
    })
    .select('*, contracts(property_name)')
    .single();
  if (error) throw new Error(error.message);
  return mapForm(data);
}

export async function linkFormToContract(
  id: string,
  contractId: string | null
): Promise<TenantForm> {
  if (!supabase) {
    mockStore = mockStore.map((f) => (f.id === id ? { ...f, contractId } : f));
    const f = mockStore.find((x) => x.id === id)!;
    return f;
  }
  const { data, error } = await supabase
    .from('tenant_forms')
    .update({ contract_id: contractId })
    .eq('id', id)
    .select('*, contracts(property_name)')
    .single();
  if (error) throw new Error(error.message);
  return mapForm(data);
}

export async function deleteForm(id: string): Promise<void> {
  if (!supabase) {
    mockStore = mockStore.filter((f) => f.id !== id);
    return;
  }
  const { error } = await supabase.from('tenant_forms').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface ReviewInput {
  generalNote?: string | null;
  incomeRentRatio?: number | null;
  landlordReference?: string | null;
  incomeVerification?: string | null;
  additionalNotes?: string | null;
  result: TenantFormResult;
}

/** Upsert the consultant review and mark the form as reviewed. */
export async function saveReview(formId: string, input: ReviewInput): Promise<TenantFormReview> {
  const user = useAuthStore.getState().user;
  if (!supabase) {
    const now = new Date().toISOString();
    const review: TenantFormReview = {
      id: uuid(),
      formId,
      reviewerId: user?.id ?? null,
      generalNote: input.generalNote ?? null,
      incomeRentRatio: input.incomeRentRatio ?? null,
      landlordReference: input.landlordReference ?? null,
      incomeVerification: input.incomeVerification ?? null,
      additionalNotes: input.additionalNotes ?? null,
      result: input.result,
      createdAt: now,
      updatedAt: now,
    };
    mockStore = mockStore.map((f) =>
      f.id === formId
        ? {
            ...f,
            review,
            reviewResult: input.result,
            status: f.status === 'completed' ? 'reviewed' : f.status,
          }
        : f
    );
    return review;
  }
  const { data, error } = await supabase
    .from('tenant_form_reviews')
    .upsert(
      {
        form_id: formId,
        reviewer_id: user?.id ?? null,
        general_note: input.generalNote ?? null,
        income_rent_ratio: input.incomeRentRatio ?? null,
        landlord_reference: input.landlordReference ?? null,
        income_verification: input.incomeVerification ?? null,
        additional_notes: input.additionalNotes ?? null,
        result: input.result,
      },
      { onConflict: 'form_id' }
    )
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  // Completed → reviewed (bir kez); pending/expired dokunma.
  await supabase
    .from('tenant_forms')
    .update({ status: 'reviewed' })
    .eq('id', formId)
    .eq('status', 'completed');
  return mapReview(data);
}

/** Signed URL for a private document (valid 1h). */
export async function documentUrl(storagePath: string): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.storage
    .from('contracts')
    .createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// Public operations (via tenant-form Edge Function; no auth)
// ---------------------------------------------------------------------------

export interface PublicFormView {
  company_name: string;
  status: 'open' | 'submitted' | 'expired';
  expires_at: string | null;
  prefill: { tenant_name: string; tenant_phone: string; tenant_email: string };
  property: {
    name: string;
    location: string;
    rent_amount: number;
    payment_day: number;
  } | null;
}

export interface SubmitDocument {
  base64: string;
  name: string;
  mime: string;
  document_type: string;
}

async function invokePublic(body: Record<string, unknown>) {
  if (!supabase) throw new Error('Bağlantı yapılandırılmamış.');
  const { data, error } = await supabase.functions.invoke('tenant-form', { body });
  if (error) {
    let msg = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const parsed = await ctx.json();
        if (parsed?.error) msg = parsed.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg || 'İşlem başarısız.');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function fetchPublicForm(token: string): Promise<PublicFormView> {
  return invokePublic({ action: 'view', token });
}

export function submitPublicForm(input: {
  token: string;
  responses: TenantFormResponses;
  documents?: SubmitDocument[];
}): Promise<{ ok: true }> {
  return invokePublic({
    action: 'submit',
    token: input.token,
    responses: input.responses,
    documents: input.documents ?? [],
  });
}

/** Build the public form link for sharing (web uses current origin). */
export function publicFormLinkFor(token: string): string {
  const base =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://kiraasist.fngn.com.tr';
  return `${base}/form/${token}`;
}
