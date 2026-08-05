import { Platform, useWindowDimensions } from 'react-native';
import { useAuthStore } from '@/store/authStore';

const BREAKPOINT = 820; // iPad (portrait Air/Pro), tablet landscape, laptop, desktop
const CONTENT_MAX = 1120; // ortalanmış içerik sütununun azami genişliği

/**
 * Masaüstü/tablet düzeni yalnızca YÖNETİCİ profilleri için ve geniş ekranlarda
 * devreye girer. Mobilde ve personelde eski (alt sekmeli) düzen korunur.
 * `sidePad` içeriği geniş ekranda ortalamak için yanlara verilecek boşluktur —
 * mobil görünümü uzatmak yerine rahat bir sütun oluşturur.
 */
export function useDesktopShell() {
  const { width } = useWindowDimensions();
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'admin' || role === 'super_admin';

  const enabled = Platform.OS === 'web' && width >= BREAKPOINT && isAdmin;
  const sidebarWidth = width >= 1024 ? 248 : 220;
  const sidePad = enabled
    ? Math.max(24, (width - sidebarWidth - CONTENT_MAX) / 2)
    : 0;

  return { enabled, sidebarWidth, sidePad };
}
