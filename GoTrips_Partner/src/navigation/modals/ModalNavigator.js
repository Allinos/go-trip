import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AppNavigator from "./AppNavigator";
import RideRequestModal from "../screens/modals/RideRequestModal";

const Stack = createNativeStackNavigator();

export default function ModalNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainApp"
        component={AppNavigator}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="RideRequestModal"
        component={RideRequestModal}
        options={{ presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}