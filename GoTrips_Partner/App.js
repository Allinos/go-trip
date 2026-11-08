import React from "react";
import { ThemeProvider } from "./src/context/ThemeContext";
// import SplashScreen from "./src/screens/SplashScreen";

import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "context/ToastContext";

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <AppNavigator />
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

{
  /* <SplashScreen /> */
}
