import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { paperTheme } from './src/theme';
import { AuthProvider } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext';
import RootNavigator from './src/navigation/RootNavigator';
import { loadLang } from './src/i18n';

export default function App() {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    loadLang().finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      {/* Paper draws Material components; icons passed by name use Ionicons like the rest of the app. */}
      <PaperProvider theme={paperTheme} settings={{ icon: (p) => <Ionicons {...p} /> }}>
        <ToastProvider>
          <AuthProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthProvider>
        </ToastProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
