import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { updateMyRide } from "api/ridesApi";
import { SafeAreaView } from "react-native-safe-area-context";

export default function EditRideScreen({ route, navigation }) {
  const { ride } = route.params; // Passed from RideDetails
  const [loading, setLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize form with existing ride data
  const [form, setForm] = useState({
    pickupAddress: "",
    dropAddress: "",
    fareAmount: "",
    pricePerSeat: "",
    scheduledDepartureTime: new Date(),
    allowPets: false,
    allowSmoking: false,
    allowLuggage: false,
    maxLuggageKg: "",
    rideNotes: "",
  });

  // Safe hydration to prevent "Too many re-renders"
  useEffect(() => {
    if (ride) {
      setForm({
        pickupAddress: ride.pickup_address || "",
        dropAddress: ride.drop_address || "",
        fareAmount: String(ride.fare_amount || ""),
        pricePerSeat: String(ride.price_per_seat || ""),
        scheduledDepartureTime: new Date(ride.scheduled_departure_time),
        allowPets: ride.allow_pets || false,
        allowSmoking: ride.allow_smoking || false,
        allowLuggage: ride.allow_luggage || false,
        maxLuggageKg: String(ride.max_luggage_kg || ""),
        rideNotes: ride.ride_notes || "",
      });
    }
  }, [ride]);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      // Mapping form state to your backend's req.body requirements
      const payload = {
        pickupAddress: form.pickupAddress,
        dropAddress: form.dropAddress,
        fareAmount: parseFloat(form.fareAmount),
        pricePerSeat: parseFloat(form.pricePerSeat),
        scheduledDepartureTime: form.scheduledDepartureTime.toISOString(),
        allowPets: form.allowPets,
        allowSmoking: form.allowSmoking,
        allowLuggage: form.allowLuggage,
        maxLuggageKg: parseFloat(form.maxLuggageKg) || 0,
        rideNotes: form.rideNotes,
      };

      const res = await updateMyRide(ride.ride_id, payload);
      if (res.success) {
        Alert.alert("Success", "Ride updated successfully");
        navigation.pop(2); // Go back to My Rides list
      }
    } catch (err) {
        console.log(err);
        
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update ride",
      );
    } finally {
      setLoading(false);
    }
  };

  const onDateTimeChange = (event, selectedValue) => {
    // 1. For Android: if 'dismissed', just close it
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      setPickerMode("date");
      return;
    }
    if (selectedValue) {
      const currentDateTime = new Date(form.scheduledDepartureTime);
      if (pickerMode === "date") {
        currentDateTime.setFullYear(
          selectedValue.getFullYear(),
          selectedValue.getMonth(),
          selectedValue.getDate(),
        );
        setForm({ ...form, scheduledDepartureTime: currentDateTime });
        setShowDatePicker(false);
        setTimeout(() => {
          setPickerMode("time");
          setShowDatePicker(true);
        }, 100);
      } else {
        currentDateTime.setHours(
          selectedValue.getHours(),
          selectedValue.getMinutes(),
        );
        setForm({ ...form, scheduledDepartureTime: currentDateTime });
        setShowDatePicker(false);
        setPickerMode("date");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Ride</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#EF5350" />
          ) : (
            <Text style={styles.saveBtn}>Update</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        <Text style={styles.sectionLabel}>LOCATION DETAILS</Text>
        <CustomInput
          label={
            ride.ride_type === "fixed_route"
              ? "Pickup Address"
              : "Current Address:"
          }
          value={form.pickupAddress}
          onChange={(v) => setForm({ ...form, pickupAddress: v })}
        />
        {ride.ride_type === "fixed_route" && (
          <CustomInput
            label="Drop Address"
            value={form.dropAddress}
            onChange={(v) => setForm({ ...form, dropAddress: v })}
          />
        )}
        <Text style={styles.sectionLabel}>PRICING</Text>
        <View style={styles.row}>
          <CustomInput
            label="Total Fare"
            value={form.fareAmount}
            keyboardType="numeric"
            style={{ flex: 1, marginRight: 10 }}
            onChange={(v) => setForm({ ...form, fareAmount: v })}
          />
          <CustomInput
            label="Price/Seat"
            value={form.pricePerSeat}
            keyboardType="numeric"
            style={{ flex: 1 }}
            onChange={(v) => setForm({ ...form, pricePerSeat: v })}
          />
        </View>

        <Text style={styles.sectionLabel}>SCHEDULE</Text>
        <TouchableOpacity
          style={styles.datePickerBtn}
          onPress={() => {
            setPickerMode("date");
            setShowDatePicker(true);
          }} 
        >
          <Ionicons name="calendar-outline" size={20} color="#64748B" />
          <Text style={styles.dateText}>
            {form.scheduledDepartureTime.toLocaleString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={form.scheduledDepartureTime}
            mode={pickerMode}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onDateTimeChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <SwitchRow
          label="Allow Pets"
          value={form.allowPets}
          onValueChange={(v) => setForm({ ...form, allowPets: v })}
        />
        <SwitchRow
          label="Allow Smoking"
          value={form.allowSmoking}
          onValueChange={(v) => setForm({ ...form, allowSmoking: v })}
        />
        <SwitchRow
          label="Allow Luggage"
          value={form.allowLuggage}
          onValueChange={(v) => setForm({ ...form, allowLuggage: v })}
        />

        {form.allowLuggage && (
          <CustomInput
            label="Max Luggage (kg)"
            value={form.maxLuggageKg}
            keyboardType="numeric"
            onChange={(v) => setForm({ ...form, maxLuggageKg: v })}
          />
        )}

        <CustomInput
          label="Notes"
          value={form.rideNotes}
          multiline
          onChange={(v) => setForm({ ...form, rideNotes: v })}
        />
      </ScrollView>
      <TouchableOpacity
        style={styles.editBtn}
        onPress={handleUpdate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#EF5350" />
        ) : (
          <Text style={styles.editBtnText}>Update</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const CustomInput = ({
  label,
  value,
  onChange,
  keyboardType = "default",
  multiline = false,
  style,
}) => (
  <View style={[{ marginBottom: 15 }, style]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        multiline && { height: 80, textAlignVertical: "top" },
      ]}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

const SwitchRow = ({ label, value, onValueChange }) => (
  <View style={styles.switchRow}>
    <Text style={styles.switchLabel}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: "#CBD5E1", true: "#FEE2E2" }}
      thumbColor={value ? "#EF5350" : "#F4F4F5"}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  saveBtn: { color: "#EF5350", fontWeight: "700", fontSize: 16 },
  scrollBody: { padding: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF5350",
    marginTop: 15,
    marginBottom: 10,
    letterSpacing: 1,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 5 },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 12,
  },
  row: { flexDirection: "row" },
  datePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateText: { marginLeft: 10, color: "#1E293B", fontWeight: "500" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  switchLabel: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  editBtn: {
    backgroundColor: "#EF5350",
    flexDirection: "row",
    padding: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
    width: "90%",
    alignSelf: "center",
  },
  editBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 10,
  },
});
