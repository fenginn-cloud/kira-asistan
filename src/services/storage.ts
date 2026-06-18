import { File } from 'expo-file-system';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

const BUCKET = 'contracts';

function sanitize(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_');
}

/**
 * Read a local file as raw bytes. More reliable on React Native than
 * fetch().blob(), which can yield empty/0-byte uploads.
 */
async function readBytes(uri: string): Promise<Uint8Array> {
  return new File(uri).bytes();
}

/**
 * Upload a contract PDF.
 * - Mock: returns the local file URI (no real storage).
 * - Supabase: uploads to the private `contracts` bucket and returns the
 *   storage PATH (stored in contract.documentUrl).
 */
export async function uploadContractDocument(params: {
  companyId: string;
  contractId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
}): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return params.fileUri;

  const path = `${params.companyId}/${params.contractId}/${Date.now()}_${sanitize(
    params.fileName
  )}`;

  const bytes = await readBytes(params.fileUri);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: params.mimeType ?? 'application/pdf',
    upsert: true,
  });
  if (error) throw error;

  return path;
}

/**
 * Upload a payment receipt (photo or PDF). Stored under the company folder so
 * the existing `contracts` bucket RLS policy applies.
 * - Mock: returns the local file URI.
 * - Supabase: returns the storage PATH.
 */
export async function uploadReceipt(params: {
  companyId: string;
  fileUri: string;
  fileName: string;
  mimeType?: string | null;
}): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return params.fileUri;

  const path = `${params.companyId}/receipts/${Date.now()}_${sanitize(params.fileName)}`;
  const bytes = await readBytes(params.fileUri);

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: params.mimeType ?? 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  return path;
}

/** Resolve a stored documentUrl into an openable URL. */
export async function getDocumentViewUrl(documentUrl: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) return documentUrl;
  if (/^https?:\/\//.test(documentUrl)) return documentUrl;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(documentUrl, 3600);
  if (error || !data) throw error ?? new Error('İmzalı URL alınamadı');
  return data.signedUrl;
}

/** Remove a stored document (no-op for mock/local URIs). */
export async function removeContractDocument(documentUrl: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  if (/^https?:\/\//.test(documentUrl)) return;
  await supabase.storage.from(BUCKET).remove([documentUrl]);
}
