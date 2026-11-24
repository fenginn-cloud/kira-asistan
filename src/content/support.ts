/** Destek kanalları (Profil → Destek). */
export const SUPPORT_WHATSAPP_DISPLAY = '0533 460 61 54';
/** wa.me biçimi: ülke kodu + numara, başında 0/+ olmadan. */
export const SUPPORT_WHATSAPP_WA = '905334606154';
export function whatsappSupportUrl(
  message = 'Merhaba, Kira Asistan hakkında destek almak istiyorum.'
) {
  return `https://wa.me/${SUPPORT_WHATSAPP_WA}?text=${encodeURIComponent(message)}`;
}
