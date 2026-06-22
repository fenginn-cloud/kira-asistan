import { Appearance, useColorScheme as useSystemScheme } from 'react-native';
import { darkTheme, lightTheme, type ThemeColors } from './colors';
import { useSettingsStore } from '@/store/settingsStore';

function resolveDark(theme: string, system: string | null | undefined): boolean {
  return theme === 'dark' || (theme === 'system' && system === 'dark');
}

/**
 * Theme colors for things that can't use Tailwind classes (Lucide icon `color`
 * props, StatusBar, chart strokes, tab bar). Derived from the user's setting
 * (light / dark / system) and reactive to both.
 */
export function useThemeColors(): ThemeColors & { isDark: boolean } {
  const theme = useSettingsStore((s) => s.theme);
  const system = useSystemScheme();
  const isDark = resolveDark(theme, system);
  return { ...(isDark ? darkTheme : lightTheme), isDark };
}

/** Non-reactive foreground color for icon `color` props (read at render). */
export function fgColor(): string {
  const theme = useSettingsStore.getState().theme;
  const isDark = resolveDark(theme, Appearance.getColorScheme());
  return isDark ? darkTheme.text : lightTheme.text;
}
