import { Platform } from 'react-native';
import { MD3LightTheme, configureFonts } from 'react-native-paper';

/**
 * Design tokens (Material Design 3, the system MUI follows).
 * Brand red is used at a shade that keeps white text readable (WCAG AA contrast).
 */
export const colors = {
  primary: '#DC2626',
  primaryDark: '#B91C1C',
  primarySoft: '#FEF2F2',
  primaryBorder: '#FECACA',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  surfaceVariant: '#F1F3F5',
  text: '#1F2328',
  sub: '#5B6470',
  faint: '#8C949E',
  border: '#DADDE2',
  divider: '#ECEEF1',
  green: '#047857',
  greenSoft: '#ECFDF5',
  amber: '#B45309',
  amberSoft: '#FFF8EB',
  blue: '#1D4ED8',
  blueSoft: '#EFF4FF',
  white: '#FFFFFF',
  overlay: 'rgba(17,24,39,0.5)',
};

/** 4-pt spacing grid. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };

/** Type scale (MD3 names in comments). Screens use these instead of ad-hoc sizes. */
export const font = {
  h1: { fontSize: 24, lineHeight: 32, fontWeight: '700', color: colors.text }, // headline small
  h2: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: colors.text }, // title large
  h3: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.text }, // title medium
  body: { fontSize: 15, lineHeight: 22, color: colors.text }, // body large
  sub: { fontSize: 14, lineHeight: 20, color: colors.sub }, // body medium
  small: { fontSize: 12, lineHeight: 16, color: colors.sub }, // body small
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: colors.sub, textTransform: 'uppercase', letterSpacing: 0.6 }, // label medium
};

export const shadow = Platform.select({
  ios: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  android: { elevation: 1 },
  default: { boxShadow: '0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.08)' },
});

export const paperTheme = {
  ...MD3LightTheme,
  roundness: 3, // → 12 px corners on inputs and buttons
  fonts: configureFonts({ config: { fontFamily: Platform.select({ web: 'Inter, system-ui, sans-serif', default: undefined }) } }),
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    onPrimary: '#FFFFFF',
    primaryContainer: colors.primarySoft,
    onPrimaryContainer: colors.primaryDark,
    secondary: '#475569',
    secondaryContainer: '#FDE2E2',
    onSecondaryContainer: colors.primaryDark,
    background: colors.bg,
    surface: colors.card,
    surfaceVariant: colors.surfaceVariant,
    onSurface: colors.text,
    onSurfaceVariant: colors.sub,
    outline: colors.border,
    outlineVariant: colors.divider,
    error: colors.primaryDark,
    elevation: { ...MD3LightTheme.colors.elevation, level0: 'transparent', level1: '#FFFFFF', level2: '#FFFFFF', level3: '#FFFFFF' },
  },
};
