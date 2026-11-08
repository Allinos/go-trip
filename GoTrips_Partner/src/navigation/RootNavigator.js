import React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useCaps } from '../context/AuthContext';
import { LocationProvider } from '../context/LocationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { Button, Loading } from '../components/ui';
import { navRef } from './ref';
import { useLanguage } from '../context/LanguageContext';
import { colors, font } from '../theme';

import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneScreen from '../screens/auth/PhoneScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import NameScreen from '../screens/onboarding/NameScreen';
import CategoryScreen from '../screens/onboarding/CategoryScreen';
import BusinessDetailsScreen from '../screens/onboarding/BusinessDetailsScreen';
import DriverDetailsScreen from '../screens/onboarding/DriverDetailsScreen';
import DocumentsScreen from '../screens/onboarding/DocumentsScreen';
import DocumentUploadScreen from '../screens/onboarding/DocumentUploadScreen';
import PaymentScreen from '../screens/onboarding/PaymentScreen';
import PaymentWebViewScreen from '../screens/onboarding/PaymentWebViewScreen';
import { stepScreen } from '../screens/onboarding/flow';
import HomeScreen from '../screens/home/HomeScreen';
import TripsScreen from '../screens/trips/TripsScreen';
import TripFormScreen from '../screens/trips/TripFormScreen';
import TripDetailScreen from '../screens/trips/TripDetailScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailScreen from '../screens/bookings/BookingDetailScreen';
import VehiclesScreen from '../screens/vehicles/VehiclesScreen';
import VehicleFormScreen from '../screens/vehicles/VehicleFormScreen';
import VehicleDetailScreen from '../screens/vehicles/VehicleDetailScreen';
import DriverProfileScreen from '../screens/driver/DriverProfileScreen';
import AccountScreen from '../screens/account/AccountScreen';
import EditProfileScreen from '../screens/account/EditProfileScreen';
import EarningsScreen from '../screens/account/EarningsScreen';
import PaymentsScreen from '../screens/account/PaymentsScreen';
import ReviewsScreen from '../screens/account/ReviewsScreen';
import NotificationsScreen from '../screens/account/NotificationsScreen';
import SupportScreen from '../screens/account/SupportScreen';
import LocationShareScreen from '../screens/account/LocationShareScreen';
import GoodsOrdersScreen from '../screens/goods/GoodsOrdersScreen';
import { t } from '../i18n';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const noHeader = { headerShown: false };

const theme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.bg } };

function Tabs() {
  const caps = useCaps();
  const icon = (name) => ({ color, size, focused }) => <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color} />;
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.faint, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' }, tabBarStyle: { height: 62, paddingTop: 6 } }}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('Home'), tabBarIcon: icon('home') }} />
      {caps.trips && <Tab.Screen name="Trips" component={TripsScreen} options={{ title: t('Trips'), tabBarIcon: icon('map') }} />}
      {caps.trips && <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: t('Bookings'), tabBarIcon: icon('people') }} />}
      {caps.vehicles && <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ title: t('Vehicles'), tabBarIcon: icon('car') }} />}
      {caps.driver && <Tab.Screen name="Profile" component={DriverProfileScreen} options={{ tabBarIcon: icon('person-circle'), title: t('My profile') }} />}
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: t('Account'), tabBarIcon: icon('settings') }} />
    </Tab.Navigator>
  );
}

function MainStack() {
  usePushNotifications(true);
  return (
    <LocationProvider enabled>
      <Stack.Navigator screenOptions={noHeader}>
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="TripForm" component={TripFormScreen} />
        <Stack.Screen name="TripDetail" component={TripDetailScreen} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
        <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
        <Stack.Screen name="EditDriverProfile" component={DriverDetailsScreen} />
        <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Earnings" component={EarningsScreen} />
        <Stack.Screen name="Payments" component={PaymentsScreen} />
        <Stack.Screen name="RenewPayment" component={PaymentScreen} />
        <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Reviews" component={ReviewsScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="LocationShare" component={LocationShareScreen} />
        <Stack.Screen name="GoodsOrders" component={GoodsOrdersScreen} />
      </Stack.Navigator>
    </LocationProvider>
  );
}

function OnboardingStack() {
  const { onboarding } = useAuth();
  return (
    <Stack.Navigator screenOptions={noHeader} initialRouteName={stepScreen(onboarding) || 'Name'}>
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Category" component={CategoryScreen} />
      <Stack.Screen name="BusinessDetails" component={BusinessDetailsScreen} />
      <Stack.Screen name="DriverDetails" component={DriverDetailsScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="PaymentWebView" component={PaymentWebViewScreen} />
    </Stack.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
    </Stack.Navigator>
  );
}

function Offline() {
  const { retry, logout } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.bg }}>
      <Ionicons name="cloud-offline-outline" size={56} color={colors.faint} />
      <Text style={font.h2}>{t("Can't reach GoTrip")}</Text>
      <Text style={[font.sub, { textAlign: 'center' }]}>{t("Please check your internet connection.")}</Text>
      <Button title={t("Try again")} onPress={retry} />
      <Button title={t("Log out")} variant="ghost" onPress={() => logout()} />
    </View>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();
  const [lang] = useLanguage();
  if (status === 'loading') return <Loading full />;
  if (status === 'offline') return <Offline />;
  return (
    // key: each phase gets a fresh navigation state (screens with the same name, e.g. "Documents",
    // exist in both onboarding and the main app and must not be carried over).
    <NavigationContainer key={`${status}-${lang}`} ref={navRef} theme={theme}>
      {status === 'loggedOut' ? <AuthStack /> : status === 'onboarding' ? <OnboardingStack /> : <MainStack />}
    </NavigationContainer>
  );
}
