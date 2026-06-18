import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/** Strip everything except digits; keep leading country code. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return digits;
}

export async function copyText(text: string): Promise<void> {
  await Clipboard.setStringAsync(text);
}

/**
 * Open WhatsApp chat with a prefilled message.
 * Falls back to wa.me (web) if the app scheme can't be opened.
 */
export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const number = normalizePhone(phone);
  const text = encodeURIComponent(message);
  const appUrl = `whatsapp://send?phone=${number}&text=${text}`;
  const webUrl = `https://wa.me/${number}?text=${text}`;
  try {
    const supported = await Linking.canOpenURL(appUrl);
    await Linking.openURL(supported ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function callPhone(phone: string): Promise<void> {
  await Linking.openURL(`tel:${normalizePhone(phone)}`);
}
