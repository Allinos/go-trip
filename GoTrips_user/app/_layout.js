import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import useAuthStore from '../store/authStore';
import usePush from '../hooks/usePush';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isLoading, isAuthenticated, initialize } = useAuthStore();
  useEffect(() => {
    initialize();
  }, [initialize]);
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);
  usePush(isAuthenticated);
  if (isLoading) return null;
  // Customers can browse without logging in; login is a modal flow when needed.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
