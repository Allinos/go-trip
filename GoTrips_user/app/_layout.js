import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import useAuthStore from '../store/authStore';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading, initialize, user } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentUser = useAuthStore.getState().user;
    const profileComplete = !!(currentUser?.fullName || currentUser?.name);

    if (!isAuthenticated && !inAuthGroup) {
      // router.replace('/(auth)/intro');
      router.replace('/(tabs)');

      return;
    }

    // if (isAuthenticated && !profileComplete) {
    //   const onRegister = segments[0] === '(auth)' && segments[1] === 'register';
    //   if (!onRegister) {
    //     router.replace('/(auth)/register');
    //   }
    //   return;
    // }

    if (isAuthenticated && inAuthGroup && profileComplete) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, user]);

  if (isLoading) {
    return null; // Or show splash screen
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="search" />
          <Stack.Screen name="ride" />
          <Stack.Screen name="rental" />
          <Stack.Screen name="marketplace" />
          <Stack.Screen name="profile" />
        </Stack>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
