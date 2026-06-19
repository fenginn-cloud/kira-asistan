// VAPID public key for Web Push. Public by design (safe to ship in the client).
// The matching PRIVATE key lives only in the Supabase Edge Function secrets.
export const VAPID_PUBLIC_KEY =
  'BKuqTk0sXYps3BdMSVK1id2iWIkG4GyNyiPTioLsTy9rZB-ONgc-eIUY1XPOAJ6yGU2zk4CIDL9gYEQwwD1-pow';

/** Convert a URL-safe base64 VAPID key to the Uint8Array push subscribe needs. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
