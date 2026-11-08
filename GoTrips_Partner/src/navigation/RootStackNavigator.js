import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeTabNavigator from "./tab/HomeTabNavigator";

// import CreateRideScreen from "screens/home/CreateRideScreen";
import CreateRideScreen2 from "screens/rides/CreateRideScreen";
import RideDetailsScreen from "screens/rides/RideDetailsScreen";
import UpdateRidesScreen from "screens/rides/UpdateRidesScreen";
import RidesBookingsScreen from "screens/rides/booking/BookingsScreen";

import AddVehicleScreen from "screens/vehicles/add.vehicles";
import VehicleDetails from "screens/vehicles/details.vehicles";
import EditVehicle from "screens/vehicles/edit.vehicles";
import PhotoseVehicle from "screens/vehicles/photos.vehicles";

import ProfileScreen from "screens/profile/ProfileScreen";

import NotificationScreen from "screens/notification";

import HelpSupport from "screens/support";
import CreateTicket from "screens/support/CreateTicket";
import Faqs from "screens/support/Faqs";

const Stack = createNativeStackNavigator();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={HomeTabNavigator} />
      {/* RIDE SCREENS */}
      {/* <Stack.Screen name="CreateRideScreen" component={CreateRideScreen} /> */}
      <Stack.Screen name="CreateRide" component={CreateRideScreen2} />
      <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
      <Stack.Screen name="UpdateRide" component={UpdateRidesScreen} />
      <Stack.Screen name="Bookings" component={RidesBookingsScreen} />
      {/* VEHICLE SCREENS */}
      <Stack.Screen name="AddVehicle" component={AddVehicleScreen} />
      <Stack.Screen name="VehicleDetails" component={VehicleDetails} />
      <Stack.Screen name="EditVehicle" component={EditVehicle} />
      <Stack.Screen name="UpdatePhotos" component={PhotoseVehicle} />
      {/* PROFILE SCREEN */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      {/* NOTIFICATIONS SCREEN */}
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      {/* SUPPORT SCREENS */}
      <Stack.Screen name="HelpSupport" component={HelpSupport} />
      <Stack.Screen name="CreateTicket" component={CreateTicket} />
      <Stack.Screen name="Faqs" component={Faqs} />
    </Stack.Navigator>
  );
}
