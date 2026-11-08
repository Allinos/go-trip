import { Platform } from 'react-native';

export const colors = {
  primary: '#EF4444',
  primaryDark: '#DC2626',
  primarySoft: '#FEF2F2',
  primaryBorder: '#FECACA',
  bg: '#F7F5F4',
  card: '#FFFFFF',
  text: '#111827',
  sub: '#6B7280',
  faint: '#9CA3AF',
  border: '#E5E7EB',
  green: '#059669',
  greenSoft: '#ECFDF5',
  amber: '#B45309',
  amberSoft: '#FFFBEB',
  blue: '#2563EB',
  blueSoft: '#EFF6FF',
  white: '#FFFFFF',
  overlay: 'rgba(17,24,39,0.45)',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = {
  h1: { fontSize: 24, fontWeight: '700', color: colors.text },
  h2: { fontSize: 19, fontWeight: '700', color: colors.text },
  h3: { fontSize: 16, fontWeight: '600', color: colors.text },
  body: { fontSize: 15, color: colors.text },
  sub: { fontSize: 14, color: colors.sub },
  small: { fontSize: 12, color: colors.sub },
  label: { fontSize: 13, fontWeight: '600', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.5 },
};

export const shadow = Platform.select({
  ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 2 },
  default: { boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
});
