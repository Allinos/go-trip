import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import useAuthStore from '../store/authStore';
import usePush from '../hooks/usePush';
import { loadLang, onLangChange } from '../i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { isLoading, isAuthenticated, initialize, reloadCatalog } = useAuthStore();
  const [lang, setLangState] = useState(null);
  useEffect(() => {
    loadLang().then((l) => {
      setLangState(l);
      initialize();
    });
    return onLangChange((l) => {
      setLangState(l);
      reloadCatalog(); // partner types / FAQs come localised from the server
    });
  }, [initialize, reloadCatalog]);
  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync().catch(() => {});
  }, [isLoading]);
  usePush(isAuthenticated);
  if (isLoading || !lang) return null;
  // Customers can browse without logging in; login is a modal flow when needed.
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack key={lang} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
