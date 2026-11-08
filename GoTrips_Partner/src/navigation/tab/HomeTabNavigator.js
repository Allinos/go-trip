import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import HomeScreen from "screens/home/HomeScreen";
import VehiclesScreen from "screens/vehicles/vehicles";
import RidesScreen from "screens/rides/MyRidesScreen";
import SettingsScreen from "screens/settings/SettingsScreen"; // Importing the new SettingsScreen

const Tab = createBottomTabNavigator();

export default function HomeTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#EF4444", // Active icon and label color
        tabBarInactiveTintColor: "gray",
        

        tabBarIcon: ({ color, size }) => {
          let icon;

          if (route.name === "Home") icon = "home";
          if (route.name === "Vehicles") icon = "car";
          if (route.name === "Rides") icon = "exit";
          if (route.name === "Earnings") icon = "wallet";
          if (route.name === "Settings") icon = "settings";

          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rides" component={RidesScreen} />
      <Tab.Screen name="Vehicles" component={VehiclesScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
