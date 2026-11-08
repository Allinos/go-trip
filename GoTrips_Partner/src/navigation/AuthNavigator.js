import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "context/AuthContext"; // Import your context

// Auth Screens
import StartScreen from "../screens/auth/StartScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import OTPVerifyScreen from "../screens/auth/OTPVerifyScreen";
import ProfileFillScreen from "../screens/auth/ProfileFillScreen";
import ProfileTypeSelect from "../screens/auth/account/AccountTypeSelect";
import DocumentUploader from "../screens/auth/account/DocumentUploader";

// Main App Screens (Import your Root/Main App Navigator here)
// import RootStackNavigator from "./RootStackNavigator"; 

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  // 1. Grab your global authentication flags
  const { isLoggedIn, isProfileCompleted } = useAuth();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {(() => {
        // CASE 1: User is completely logged out -> Provide only Auth paths
        if (!isLoggedIn) {
          return (
            <>
              <Stack.Screen name="Start" component={StartScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="OTPVerify" component={OTPVerifyScreen} />
            </>
          );
        }

        // CASE 2: User is logged in, but has NOT completed profile onboarding
        if (isLoggedIn && !isProfileCompleted) {
          return (
            <>
              <Stack.Screen name="ProfileFill" component={ProfileFillScreen} />
              <Stack.Screen name="ProfileTypeSelect" component={ProfileTypeSelect} />
              <Stack.Screen name="DocumentUploader" component={DocumentUploader} />
            </>
          );
        }

        // CASE 3: Logged in and setup finished -> Mount the rest of the application
        // return <Stack.Screen name="MainApp" component={RootStackNavigator} />;
      })()}
    </Stack.Navigator>
  );
}