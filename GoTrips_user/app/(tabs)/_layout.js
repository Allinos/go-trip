import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

export default function TabsLayout() {
  const icon = (name) => ({ color, size }) => <MaterialIcons name={name} size={size} color={color} />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: COLORS.primary, tabBarInactiveTintColor: COLORS.tabs.inactive, tabBarLabelStyle: { fontWeight: '600', fontSize: 12 }, tabBarStyle: { height: 62, paddingTop: 6, borderTopColor: COLORS.border } }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="bookings" options={{ title: 'Bookings', tabBarIcon: icon('event-note') }} />
      <Tabs.Screen name="rental" options={{ title: 'Rentals', tabBarIcon: icon('car-rental') }} />
      <Tabs.Screen name="marketplace" options={{ title: 'Drivers', tabBarIcon: icon('badge') }} />
      <Tabs.Screen name="settings" options={{ title: 'Account', tabBarIcon: icon('person') }} />
    </Tabs>
  );
}
