export interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  /** Max national digits (for input limiting). */
  max: number;
}

/** Common country dial codes; Türkiye first (default). */
export const COUNTRIES: Country[] = [
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Türkiye', max: 10 },
  { code: 'US', dial: '+1', flag: '🇺🇸', name: 'ABD', max: 10 },
  { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Almanya', max: 11 },
  { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'İngiltere', max: 10 },
  { code: 'NL', dial: '+31', flag: '🇳🇱', name: 'Hollanda', max: 9 },
  { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'Fransa', max: 9 },
  { code: 'AZ', dial: '+994', flag: '🇦🇿', name: 'Azerbaycan', max: 9 },
  { code: 'RU', dial: '+7', flag: '🇷🇺', name: 'Rusya', max: 10 },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'BAE', max: 9 },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'S. Arabistan', max: 9 },
  { code: 'QA', dial: '+974', flag: '🇶🇦', name: 'Katar', max: 8 },
  { code: 'BG', dial: '+359', flag: '🇧🇬', name: 'Bulgaristan', max: 9 },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]!;

/** Group national digits for display. Turkish: 5XX XXX XX XX. */
export function formatNational(dial: string, digits: string): string {
  if (dial === '+90') {
    const parts = [
      digits.slice(0, 3),
      digits.slice(3, 6),
      digits.slice(6, 8),
      digits.slice(8, 10),
    ].filter(Boolean);
    return parts.join(' ');
  }
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

/** Split a stored value like "+90 555 123 12 12" into dial + digits. */
export function parsePhone(value: string): { dial: string; digits: string } {
  const trimmed = (value ?? '').trim();
  const match = trimmed.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const dial = match[1]!;
    const known = COUNTRIES.find((c) => c.dial === dial);
    if (known) return { dial, digits: match[2]!.replace(/[^\d]/g, '') };
  }
  // Fallback: default country, keep any digits.
  return { dial: DEFAULT_COUNTRY.dial, digits: trimmed.replace(/[^\d]/g, '') };
}

/** Compose the canonical stored value. Empty national -> empty string. */
export function composePhone(dial: string, digits: string): string {
  if (!digits) return '';
  return `${dial} ${formatNational(dial, digits)}`;
}
