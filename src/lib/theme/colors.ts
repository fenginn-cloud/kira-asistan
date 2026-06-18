/**
 * Color tokens used outside of Tailwind classes (icons, charts, status bars).
 * Keep in sync with tailwind.config.js.
 */
export const palette = {
  primary: '#2563EB',
  primarySoft: '#EFF6FF',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  white: '#FFFFFF',
  black: '#0B1220',
  muted: '#6B7280',
  border: '#E5E7EB',
} as const;

export const lightTheme = {
  background: '#F2F4F7',
  surface: '#FFFFFF',
  text: '#0B1220',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  card: '#FFFFFF',
};

export const darkTheme = {
  background: '#0B1220',
  surface: '#161D2E',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#22293A',
  card: '#161D2E',
};

export type ThemeColors = typeof lightTheme;
