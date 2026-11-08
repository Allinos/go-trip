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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getVehicleDetails, updateVehicle } from "api/vehiclesApi";

const AVAILABLE_FEATURES = [
  "Leather Seats",
  "Panoramic Sunroof",
  "Backup Camera",
  "Bluetooth Audio",
  "GPS",
  "Child Seat",
];

export default function EditVehicleScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    // vehicleType: "rental_car",
    vehicleCategory: "suv",
    // manufacturer: "",
    // model: "",
    // year: "",
    color: "",
    // numberPlate: "",
    seatingCapacity: 0,
    // fuelType: "hybrid",
    acAvailable: true,
    // isAvailable: true,
    rentalPricePerHour: "",
    rentalPricePerDay: "",
    ridePricePerKm: "",
    baseFare: "",
    features: [],
  });

  useEffect(() => {
    loadVehicle();
  }, []);

  // Helper to extract value from your API's specific Decimal format {d: [val]}
  const parseDecimal = (obj) => obj?.d?.[0]?.toString() || "";

  const loadVehicle = async () => {
    try {
      const res = await getVehicleDetails(vehicleId);
      if (res.success) {
        const v = res.data;
        setForm({
          // vehicleType: v.vehicle_type || "rental_car",
          vehicleCategory: v.vehicle_category || "suv",
          // manufacturer: v.manufacturer || "",
          // model: v.model || "",
          // year: String(v.year || ""),
          color: v.color || "",
          // numberPlate: v.number_plate || "",
          seatingCapacity: v.seating_capacity || 0,
          // fuelType: v.fuel_type || "hybrid",
          acAvailable: !!v.ac_available,
          // isAvailable: !!v.is_available,
          rentalPricePerHour: parseDecimal(v.rental_price_per_hour),
          rentalPricePerDay: parseDecimal(v.rental_price_per_day),
          ridePricePerKm: parseDecimal(v.ride_price_per_km),
          baseFare: parseDecimal(v.base_fare),
          features: v.features || [],
        });
      }
    } catch (err) {
      Alert.alert("Error", "Could not fetch vehicle details");
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = (feature) => {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      // Constructing payload to match your required data structure
      const payload = {
        ...form,
        // year: Number(form.year),
        seatingCapacity: parseInt(form.seatingCapacity) || 0,
        rentalPricePerHour: parseFloat(form.rentalPricePerHour),
        rentalPricePerDay: parseFloat(form.rentalPricePerDay),
        ridePricePerKm: parseFloat(form.ridePricePerKm),
        baseFare: parseFloat(form.baseFare),
      };

      const res = await updateVehicle(vehicleId, payload);
      if (res.success) {
        Alert.alert("Success", "Vehicle updated successfully");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert("Error", "Update failed");
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#EF5350" />
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Vehicle</Text>
        <TouchableOpacity onPress={handleUpdate}>
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.form}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Basic Info</Text>
        <Input
          label="vehicle Category"
          value={form.vehicleCategory}
          onChange={(v) => setForm({ ...form, vehicleCategory: v })}
        />
        {/* <Input label="Model" value={form.model} onChange={(v) => setForm({...form, model: v})} /> */}

        <View style={styles.row}>
          {/* <Input label="Year" value={form.year} keyboardType="numeric" style={{ flex: 1, marginRight: 10 }} onChange={(v) => setForm({...form, year: v})} /> */}
          <Input
            label="Color"
            value={form.color}
            style={{ width: "58%", marginRight: 10 }}
            onChange={(v) => setForm({ ...form, color: v })}
          />
          <Input
            label="Seating Capacity"
            value={String(form.seatingCapacity)}
            style={{ width: "38%" }}
            keyboardType="numeric"
            onChange={(v) => setForm({ ...form, seatingCapacity: v })}
          />
        </View>

        {/* <Input label="Number Plate" value={form.numberPlate} onChange={(v) => setForm({...form, numberPlate: v})} /> */}

        <Text style={styles.sectionTitle}>Status & AC</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>AC Available</Text>
            <Switch
              value={form.acAvailable}
              onValueChange={(v) => setForm({ ...form, acAvailable: v })}
              trackColor={{ false: "#CBD5E1", true: "#FEE2E2" }}
              thumbColor={form.acAvailable ? "#EF5350" : "#F4F4F5"}
            />
          </View>
          {/* <View style={styles.switchContainer}>
            <Text style={styles.label}>Is Available</Text>
            <Switch value={form.isAvailable} onValueChange={(v) => setForm({...form, isAvailable: v})} trackColor={{ false: "#CBD5E1", true: "#FEE2E2" }} thumbColor={form.isAvailable ? "#EF5350" : "#F4F4F5"} />
          </View> */}
        </View>

        <Text style={styles.sectionTitle}>Pricing (Decimal Values)</Text>
        <View style={styles.row}>
          <Input
            label="Price/Hour"
            value={form.rentalPricePerHour}
            keyboardType="decimal-pad"
            style={{ flex: 1, marginRight: 10 }}
            onChange={(v) => setForm({ ...form, rentalPricePerHour: v })}
          />
          <Input
            label="Price/Day"
            value={form.rentalPricePerDay}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
            onChange={(v) => setForm({ ...form, rentalPricePerDay: v })}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Price/KM"
            value={form.ridePricePerKm}
            keyboardType="decimal-pad"
            style={{ flex: 1, marginRight: 10 }}
            onChange={(v) => setForm({ ...form, ridePricePerKm: v })}
          />
          <Input
            label="Base Fare"
            value={form.baseFare}
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
            onChange={(v) => setForm({ ...form, baseFare: v })}
          />
        </View>

        <Text style={styles.sectionTitle}>Features</Text>
        <View style={styles.chipContainer}>
          {AVAILABLE_FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature}
              onPress={() => toggleFeature(feature)}
              style={[
                styles.chip,
                form.features.includes(feature) && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  form.features.includes(feature) && styles.chipTextActive,
                ]}
              >
                {feature}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate}>
          <Text style={styles.updateBtnText}>Update Vehicle Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const Input = ({ label, value, onChange, style, keyboardType = "default" }) => (
  <View style={[{ marginBottom: 15 }, style]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboardType}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#fff",
  },
  title: { fontSize: 18, fontWeight: "700" },
  saveBtnText: { color: "#EF5350", fontWeight: "700" },
  form: { padding: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#EF5350",
    marginBottom: 15,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  label: { fontSize: 12, fontWeight: "600", color: "#64748B", marginBottom: 5 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
  },
  row: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    width: "48%",
    justifyContent: "space-between",
  },
  chipContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: { backgroundColor: "#EF5350", borderColor: "#EF5350" },
  chipText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  updateBtn: {
    backgroundColor: "#EF5350",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  updateBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
