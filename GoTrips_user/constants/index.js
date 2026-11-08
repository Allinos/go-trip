// App Constants and Configuration

export const API_BASE_URL = 'https://api.rideflow.com'; // Change to your API URL
// For local development: 'http://192.168.1.100:3000'

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

export const VEHICLE_TYPES = [
  { 
    id: 'taxi', 
    label: 'Taxi', 
    icon: 'car',
    description: 'Book a taxi ride'
  },
  { 
    id: 'bike', 
    label: 'Bike', 
    icon: 'motorcycle',
    description: 'Quick bike rides'
  },
  { 
    id: 'rental', 
    label: 'Rental', 
    icon: 'car-key',
    description: 'Rent vehicles'
  },
  { 
    id: 'commercial', 
    label: 'Trucks', 
    icon: 'truck',
    description: 'Commercial transport'
  },
];

export const RIDE_STATUSES = {
  pending: { label: 'Pending', color: COLORS.status.pending },
  scheduled: { label: 'Scheduled', color: COLORS.info },
  confirmed: { label: 'Confirmed', color: COLORS.status.confirmed },
  started: { label: 'Started', color: COLORS.info },
  completed: { label: 'Completed', color: COLORS.status.completed },
  cancelled: { label: 'Cancelled', color: COLORS.status.cancelled },
};

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: 'cash' },
  { id: 'upi', label: 'UPI', icon: 'cellphone' },
  { id: 'card', label: 'Card', icon: 'credit-card' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet' },
];

export const DOCUMENT_TYPES = [
  { id: 'aadhar', label: 'Aadhar Card', requiresBack: true },
  { id: 'pan', label: 'PAN Card', requiresBack: false },
  { id: 'license', label: 'Driving License', requiresBack: true },
  { id: 'passport', label: 'Passport', requiresBack: false },
];

export const LANGUAGES = [
  { id: 'en', label: 'English', nativeLabel: 'English' },
  { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { id: 'as', label: 'Assamese', nativeLabel: 'অসমীয়া' },
  { id: 'bn', label: 'Bengali', nativeLabel: 'বাংলা' },
];

export const VALIDATION_RULES = {
  phone: {
    pattern: /^[6-9]\d{9}$/,
    message: 'Phone number must be 10 digits starting with 6-9',
  },
  otp: {
    pattern: /^\d{6}$/,
    message: 'OTP must be 6 digits',
  },
  name: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s]+$/,
    message: 'Name should contain only letters',
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email format',
  },
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNAUTHORIZED: 'Session expired. Please login again.',
  NOT_FOUND: 'Resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN_ERROR: 'Something went wrong. Please try again.',
};

export const RAZORPAY_KEY = 'rzp_test_your_key'; // Replace with your key

export default {
  API_BASE_URL,
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  VEHICLE_TYPES,
  RIDE_STATUSES,
  PAYMENT_METHODS,
  DOCUMENT_TYPES,
  LANGUAGES,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  RAZORPAY_KEY,
};
