import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { getMyVehicles } from "api/vehiclesApi";
import { createRide } from "api/ridesApi";
import { getStoredLocations } from "services/locationServices";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateRideScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState("date");
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [allLocations, setAllLocations] = useState([]);
  const [filteredPoints, setFilteredPoints] = useState([]);

  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [activeType, setActiveType] = useState("pickup");
  const [tempLocation, setTempLocation] = useState({
    district: "",
    point: "",
    address: "",
  });

  const [form, setForm] = useState({
    rideType: "fixed_route",
    vehicleId: "",
    pickupAddress: "",
    dropAddress: "",
    totalSeats: "",
    totalCapacityKg: "",
    fareAmount: "",
    pricePerSeat: "",
    pricePerKm: "",
    baseFare: "",
    scheduledDepartureTime: new Date(Date.now() + 10 * 60000),
    rideCategory: "economy",
    allowPets: false,
    allowSmoking: false,
    allowLuggage: true,
    maxLuggageKg: "",
    rideNotes: "",
  });

  useEffect(() => {
    fetchVehicles();
    const loadData = async () => {
      const data = await getStoredLocations();
      setAllLocations(data);
    };
    loadData();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await getMyVehicles();
      if (res.success) setVehicles(res.data);
    } catch (err) {
      console.error("Failed to load vehicles", err);
    }
  };

  const handleVehicleSelect = (v) => {
    setForm({
      ...form,
      vehicleId: v.vehicle_id.toString(),
      totalSeats: String(v.seating_capacity || ""),
      rideCategory:
        v.vehicle_type === "commercial_vehicle" ? "commercial" : "economy",
    });
    setSelectedVehicle(v);
  };

  const onPickerChange = (event, selectedValue) => {
    if (event.type === "dismissed") {
      setShowPicker(false);
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
        setShowPicker(false);
        setTimeout(() => {
          setPickerMode("time");
          setShowPicker(true);
        }, 100);
      } else {
        currentDateTime.setHours(
          selectedValue.getHours(),
          selectedValue.getMinutes(),
        );
        setForm({ ...form, scheduledDepartureTime: currentDateTime });
        setShowPicker(false);
        setPickerMode("date");
      }
    }
  };

  const handlePublish = async () => {
    if (!form.vehicleId) return Alert.alert("Error", "Please select a vehicle");
    if (!form.pickupAddress)
      return Alert.alert("Error", "Pickup address is required");
    if (form.rideType === "fixed_route" && !form.dropAddress)
      return Alert.alert("Error", "Destination is required for Fixed Routes");

    setLoading(true);
    const payload = {
      ...form,
      scheduledDepartureTime: form.scheduledDepartureTime.toISOString(),
      totalSeats: form.totalSeats ? parseInt(form.totalSeats) : undefined,
      totalCapacityKg: form.totalCapacityKg
        ? parseFloat(form.totalCapacityKg)
        : undefined,
      fareAmount: form.fareAmount ? parseFloat(form.fareAmount) : undefined,
      pricePerSeat: form.pricePerSeat
        ? parseFloat(form.pricePerSeat)
        : undefined,
      maxLuggageKg: form.maxLuggageKg
        ? parseFloat(form.maxLuggageKg)
        : undefined,
      pricePerKm:
        form.rideType === "open_ride" ? parseFloat(form.pricePerKm) : undefined,
      baseFare:
        form.rideType === "open_ride" ? parseFloat(form.baseFare) : undefined,
    };

    try {
      const response = await createRide(payload);
      if (response.success) {
        Alert.alert("Success", "Ride published successfully!");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Ride publishing failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const openLocationModal = (type) => {
    setActiveType(type);
    setLocationModalVisible(true);
  };

  const handleLocationConfirm = () => {
    const { district, point, address } = tempLocation;
    if (!district || !point)
      return Alert.alert("Error", "Please select district and point");

    const combinedString = address
      ? `${address}, ${point}, ${district}`
      : `${point}, ${district}`;
    setForm({
      ...form,
      [activeType === "pickup" ? "pickupAddress" : "dropAddress"]:
        combinedString,
    });
    setLocationModalVisible(false);
  };

  const handleDistrictSelect = (districtId) => {
    const selectedData = allLocations.find(
      (loc) => loc.districtId === districtId,
    );
    setTempLocation({
      ...tempLocation,
      district: selectedData?.district,
      point: "",
    });
    setFilteredPoints(selectedData ? selectedData.points : []);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Location Selection Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set {activeType === "pickup" ? "Pickup" : "Drop"} Location
              </Text>
              <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#CBD5E1" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>1. Select District</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipList}
            >
              {allLocations.map((item) => (
                <TouchableOpacity
                  key={item.districtId}
                  onPress={() => handleDistrictSelect(item.districtId)}
                  style={[
                    styles.miniChip,
                    tempLocation.district === item.district &&
                      styles.miniChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      tempLocation.district === item.district &&
                        styles.textWhite,
                    ]}
                  >
                    {item.district}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>2. Select Area/Point</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipList}
            >
              {filteredPoints.map((point) => (
                <TouchableOpacity
                  key={point.pointId}
                  onPress={() =>
                    setTempLocation({ ...tempLocation, point: point.name })
                  }
                  style={[
                    styles.miniChip,
                    tempLocation.point === point.name &&
                      styles.miniChipActivePoint,
                  ]}
                >
                  <Text
                    style={[
                      styles.miniChipText,
                      tempLocation.point === point.name && styles.textDark,
                    ]}
                  >
                    {point.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <CustomInput
              label="3. Landmark / House No. (Optional)"
              placeholder="e.g. Near City Mall"
              value={tempLocation.address}
              onChange={(t) => setTempLocation({ ...tempLocation, address: t })}
            />

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleLocationConfirm}
            >
              <Text style={styles.publishText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Create {form.rideType === "fixed_route" ? "Fixed" : "Open"} Ride
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride Type Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              form.rideType === "fixed_route" && styles.tabActive,
            ]}
            onPress={() => setForm({ ...form, rideType: "fixed_route" })}
          >
            <Text
              style={[
                styles.tabText,
                form.rideType === "fixed_route" && styles.tabTextActive,
              ]}
            >
              Fixed Route
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              form.rideType === "open_ride" && styles.tabActive,
            ]}
            onPress={() => setForm({ ...form, rideType: "open_ride" })}
          >
            <Text
              style={[
                styles.tabText,
                form.rideType === "open_ride" && styles.tabTextActive,
              ]}
            >
              Open Ride
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vehicle Selection Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.label}>Select Your Vehicle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.vList}
          >
            {vehicles.map((v) => (
              <TouchableOpacity
                key={v.vehicle_id}
                onPress={() => handleVehicleSelect(v)}
                style={[
                  styles.vChip,
                  form.vehicleId === v.vehicle_id.toString() &&
                    styles.vChipActive,
                ]}
              >
                <FontAwesome5
                  name="car-side"
                  size={16}
                  color={
                    form.vehicleId === v.vehicle_id.toString()
                      ? "#FFF"
                      : "#64748B"
                  }
                />
                <Text
                  style={[
                    styles.vText,
                    form.vehicleId === v.vehicle_id.toString() &&
                      styles.textWhite,
                  ]}
                >
                  {v.model}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Route Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Route Details</Text>
          <TouchableOpacity
            onPress={() => openLocationModal("pickup")}
            style={styles.locationInput}
          >
            <Ionicons name="location" size={20} color="#10B981" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>Pickup From</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {form.pickupAddress || "Select pickup point"}
              </Text>
            </View>
          </TouchableOpacity>

          {form.rideType === "fixed_route" && (
            <TouchableOpacity
              onPress={() => openLocationModal("drop")}
              style={[styles.locationInput, { marginTop: 12 }]}
            >
              <Ionicons name="flag" size={20} color="#EF4444" />
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Destination To</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {form.dropAddress || "Select destination"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <Text style={[styles.label, { marginTop: 15 }]}>
            Scheduled Departure
          </Text>
          <TouchableOpacity
            style={styles.dateTimeBtn}
            onPress={() => {
              setPickerMode("date");
              setShowPicker(true);
            }}
          >
            <View style={styles.dateTimeGroup}>
              <MaterialCommunityIcons
                name="calendar-clock"
                size={22}
                color="#EF5350"
              />
              <Text style={styles.dateVal}>
                {form.scheduledDepartureTime.toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}{" "}
                •{" "}
                {form.scheduledDepartureTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        {/* Capacity & Pricing */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Capacity & Pricing</Text>
          <Text style={styles.label}>
            selected vehicle: {selectedVehicle?.vehicle_type}
          </Text>
          <View style={styles.row}>
            {selectedVehicle?.vehicle_type !== "commercial_vehicle" ? (
              <CustomInput
                label="Available Seats"
                value={form.totalSeats}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 10 }}
                onChange={(t) => setForm({ ...form, totalSeats: t })}
              />
            ) : (
              <CustomInput
                label="Capacity (kg)"
                value={form.totalCapacityKg}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 10 }}
                onChange={(t) => setForm({ ...form, totalCapacityKg: t })}
              />
            )}
            <View style={{ flex: 1 }} />
          </View>

          {form.rideType === "fixed_route" ? (
            <View style={styles.row}>
              <CustomInput
                label="Total Fare"
                value={form.fareAmount}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 10 }}
                onChange={(t) => setForm({ ...form, fareAmount: t })}
              />
              <CustomInput
                label="Price / Seat"
                value={form.pricePerSeat}
                keyboardType="numeric"
                style={{ flex: 1 }}
                onChange={(t) => setForm({ ...form, pricePerSeat: t })}
              />
            </View>
          ) : (
            <View style={styles.row}>
              <CustomInput
                label="Base Fare"
                value={form.baseFare}
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 10 }}
                onChange={(t) => setForm({ ...form, baseFare: t })}
              />
              <CustomInput
                label="Price / Km"
                value={form.pricePerKm}
                keyboardType="numeric"
                style={{ flex: 1 }}
                onChange={(t) => setForm({ ...form, pricePerKm: t })}
              />
            </View>
          )}
        </View>

        {/* Rules Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <SwitchRow
            label="Allow Pets"
            value={form.allowPets}
            onValueChange={(v) => setForm({ ...form, allowPets: v })}
            icon="dog"
          />
          <SwitchRow
            label="Smoking Allowed"
            value={form.allowSmoking}
            onValueChange={(v) => setForm({ ...form, allowSmoking: v })}
            icon="smoking"
          />
          <SwitchRow
            label="Luggage Space"
            value={form.allowLuggage}
            onValueChange={(v) => setForm({ ...form, allowLuggage: v })}
            icon="bag-personal"
          />

          {form.allowLuggage && (
            <CustomInput
              label="Max Luggage (kg)"
              value={form.maxLuggageKg}
              keyboardType="numeric"
              onChange={(t) => setForm({ ...form, maxLuggageKg: t })}
            />
          )}

          <CustomInput
            label="Additional Notes"
            value={form.rideNotes}
            multiline
            placeholder="Special instructions for passengers..."
            onChange={(t) => setForm({ ...form, rideNotes: t })}
          />
        </View>

        {showPicker && (
          <DateTimePicker
            value={form.scheduledDepartureTime}
            mode={pickerMode}
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickerChange}
            minimumDate={new Date()}
          />
        )}

        <TouchableOpacity
          style={styles.publishBtn}
          onPress={handlePublish}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.publishText}>Publish Ride</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const CustomInput = ({
  label,
  value,
  onChange,
  placeholder,
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
      placeholder={placeholder}
      placeholderTextColor="#94A3B8"
      onChangeText={onChange}
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

const SwitchRow = ({ label, value, onValueChange, icon }) => (
  <View style={styles.switchRow}>
    <View style={styles.rowAlignCenter}>
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color="#64748B"
        style={{ marginRight: 10 }}
      />
      <Text style={styles.switchLabel}>{label}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: "#FCA5A5", false: "#E2E8F0" }}
      thumbColor={value ? "#EF5350" : "#F8F9FA"}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 19, fontWeight: "800", color: "#1E293B" },
  backBtn: { padding: 8 },
  scrollBody: { padding: 16 },
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "#FFF", elevation: 2 },
  tabText: { fontWeight: "600", color: "#64748B" },
  tabTextActive: { color: "#EF5350" },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  locationTextContainer: { marginLeft: 12, flex: 1 },
  locationLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },
  locationValue: { fontSize: 15, color: "#1E293B", fontWeight: "500" },
  dateTimeBtn: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateTimeGroup: { flexDirection: "row", alignItems: "center" },
  dateVal: {
    marginLeft: 10,
    color: "#1E293B",
    fontWeight: "600",
    fontSize: 15,
  },
  row: { flexDirection: "row" },
  rowAlignCenter: { flexDirection: "row", alignItems: "center" },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  switchLabel: { color: "#334155", fontSize: 15, fontWeight: "500" },
  vList: { marginTop: 5 },
  vChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  vChipActive: { backgroundColor: "#EF5350", borderColor: "#EF5350" },
  vText: { marginLeft: 8, color: "#475569", fontWeight: "700" },
  textWhite: { color: "#FFF" },
  publishBtn: {
    backgroundColor: "#EF5350",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
    shadowColor: "#EF5350",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  publishText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  modalLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 10,
  },
  chipList: { marginBottom: 20, flexGrow: 0 },
  miniChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniChipActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  miniChipActivePoint: { backgroundColor: "#D1FAE5", borderColor: "#10B981" },
  miniChipText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  confirmBtn: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  textDark: { color: "#065F46" },
});
