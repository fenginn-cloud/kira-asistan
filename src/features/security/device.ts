import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'kira_device_token';

/** Cihaz başına kalıcı kimlik (yerelde saklanır). */
export async function getDeviceToken(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(KEY);
    if (existing) return existing;
  } catch {
    // storage yoksa üret
  }
  const token =
    'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    await AsyncStorage.setItem(KEY, token);
  } catch {
    // yoksay
  }
  return token;
}

/** Okunur cihaz etiketi: "Chrome · Windows" / "iOS" / "Android". */
export function getDeviceLabel(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    const browser =
      /edg/i.test(ua) ? 'Edge'
      : /opr|opera/i.test(ua) ? 'Opera'
      : /chrome|crios/i.test(ua) ? 'Chrome'
      : /firefox|fxios/i.test(ua) ? 'Firefox'
      : /safari/i.test(ua) ? 'Safari'
      : 'Tarayıcı';
    const os =
      /windows/i.test(ua) ? 'Windows'
      : /iphone|ipad|ipod/i.test(ua) ? 'iOS'
      : /android/i.test(ua) ? 'Android'
      : /mac os/i.test(ua) ? 'macOS'
      : /linux/i.test(ua) ? 'Linux'
      : '';
    return os ? `${browser} · ${os}` : browser;
  }
  return Platform.OS === 'ios' ? 'iOS uygulaması' : Platform.OS === 'android' ? 'Android uygulaması' : 'Uygulama';
}

export function devicePlatform(): string {
  return Platform.OS;
}
