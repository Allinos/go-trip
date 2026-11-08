import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, useAuth } from "context/AuthContext"; // Import your context

import AuthNavigator from "./AuthNavigator";
import RootStackNavigator from "./RootStackNavigator";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator();

function Navigation() {
  // 1. Pull both states from your updated context
  const { isLoggedIn, isProfileCompleted } = useAuth();

  console.log("Auth State:", { isLoggedIn, isProfileCompleted });

  return (
    <NavigationContainer>
      {(() => {
        if (isLoggedIn && isProfileCompleted) {
          return <RootStackNavigator />;
        }
        // Condition C: Logged in AND Profile is complete -> Show Main App / Tabs
        return <AuthNavigator />;
      })()}
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
