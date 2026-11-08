// App Constants and Configuration

import Constants from 'expo-constants';
import { t } from '../i18n';

// EXPO_PUBLIC_API_URL (.env) → app.json extra.apiUrl → Android emulator default
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:3000/api/v1';

export const COLORS = {
  primary: '#EF4444',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  
  secondary: '#FF6B35',
  secondaryGradient: ['#EF4444', '#FF6B35'],
  
  background: '#FFFFFF',
  surface: '#F9FAFB',
  card: '#FFFFFF',
  
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    white: '#FFFFFF',
  },
  
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  tabs: {
    active: '#EF4444',
    inactive: '#9CA3AF',
  },
  
  status: {
    pending: '#F59E0B',
    confirmed: '#10B981',
    cancelled: '#EF4444',
    completed: '#6B7280',
  }
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: '700' },
  h2: { fontSize: 24, fontWeight: '600' },
  h3: { fontSize: 20, fontWeight: '600' },
  h4: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 16, fontWeight: '400' },
  bodyBold: { fontSize: 16, fontWeight: '600' },
  caption: { fontSize: 14, fontWeight: '400' },
  captionBold: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 12, fontWeight: '400' },
  tiny: { fontSize: 10, fontWeight: '400' },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 999,
};

export const SERVICES = [
  { id: 'trips', label: 'Trips', icon: 'car', route: '/' },
  { id: 'rental', label: 'Rentals', icon: 'car-key', route: '/(tabs)/rental' },
  { id: 'drivers', label: 'Drivers', icon: 'card-account-details', route: '/(tabs)/marketplace' },
  { id: 'goods', label: 'Goods', icon: 'truck', route: '/goods', feature: 'goodsOrders' },
];

const VEHICLE_RAW = {
  hatchback: 'Hatchback', sedan: 'Sedan', suv: 'SUV', muv: 'MUV', van: 'Van', mini_bus: 'Mini bus', bus: 'Bus', auto: 'Auto', bike: 'Bike',
  pickup: 'Pickup', tempo: 'Tempo', mini_truck: 'Mini truck', truck: 'Truck', trailer: 'Trailer', other: 'Other',
};

export const BOOKING_STATUS = {
  pending: { label: 'Waiting for driver', color: '#B45309', bg: '#FFFBEB' },
  accepted: { label: 'Confirmed', color: '#059669', bg: '#ECFDF5' },
  rejected: { label: 'Declined', color: '#DC2626', bg: '#FEF2F2' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' },
  completed: { label: 'Completed', color: '#2563EB', bg: '#EFF6FF' },
  expired: { label: 'Expired', color: '#6B7280', bg: '#F3F4F6' },
};

// Vehicle names follow the current language.
export const VEHICLE_LABELS = new Proxy(VEHICLE_RAW, { get: (o, k) => (typeof o[k] === 'string' ? t(o[k]) : o[k]) });
