import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { registerVehicleWithPhoto } from "api/vehiclesApi";

export default function AddVehicleScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);

  // Form State based on your data structure
  const [formData, setFormData] = useState({
    vehicleType: "rental_car",
    vehicleCategory: "suv",
    manufacturer: "",
    model: "",
    year: 2024,
    color: "",
    numberPlate: "",
    seatingCapacity: 7,
    fuelType: "hybrid",
    acAvailable: true,
    rentalPricePerHour: 15.5,
    rentalPricePerDay: 120.0,
    ridePricePerKm: 2.25,
    baseFare: 10.0,
    features: ["Leather Seats", "Backup Camera"],
  });

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Call the separated service logic
      await registerVehicleWithPhoto(formData, image);

      Alert.alert("Success", "Vehicle and photo uploaded successfully!");
      navigation.goBack();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to register vehicle";
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Vehicle</Text>
        <TouchableOpacity onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#EF5350" />
          ) : (
            <Text style={styles.saveBtn}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* IMAGE UPLOADER */}
        <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.previewImage} />
          ) : (
            <View style={styles.uploadPlaceholder}>
              <Ionicons name="camera" size={40} color="#EF5350" />
              <Text style={styles.uploadText}>Upload Vehicle Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>BASIC DETAILS</Text>
        <CustomInput
          label="Manufacturer"
          value={formData.manufacturer}
          onChange={(val) => setFormData({ ...formData, manufacturer: val })}
          placeholder="e.g. Toyota"
        />
        <CustomInput
          label="Model"
          value={formData.model}
          onChange={(val) => setFormData({ ...formData, model: val })}
          placeholder="e.g. Highlander"
        />

        <View style={styles.row}>
          <CustomInput
            label="Year"
            value={formData.year.toString()}
            onChange={(val) =>
              setFormData({ ...formData, year: parseInt(val) })
            }
            placeholder="2024"
            keyboard="numeric"
            style={{ flex: 1, marginRight: 10 }}
          />
          <CustomInput
            label="Color"
            value={formData.color}
            onChange={(val) => setFormData({ ...formData, color: val })}
            placeholder="Midnight Blue"
            style={{ flex: 1 }}
          />
        </View>

        <CustomInput
          label="Number Plate"
          value={formData.numberPlate}
          onChange={(val) => setFormData({ ...formData, numberPlate: val })}
          placeholder="ABC-1234-XYZ"
        />

        <Text style={styles.sectionLabel}>SPECIFICATIONS</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Air Conditioning (AC)</Text>
          <Switch
            value={formData.acAvailable}
            onValueChange={(val) =>
              setFormData({ ...formData, acAvailable: val })
            }
            trackColor={{ false: "#E2E8F0", true: "#FEE2E2" }}
            thumbColor={formData.acAvailable ? "#EF5350" : "#f4f3f4"}
          />
        </View>

        <Text style={styles.sectionLabel}>PRICING (USD)</Text>
        <View style={styles.row}>
          <CustomInput
            label="Price /Day"
            value={formData.rentalPricePerDay.toString()}
            onChange={(val) =>
              setFormData({ ...formData, rentalPricePerDay: parseFloat(val) })
            }
            keyboard="numeric"
            style={{ flex: 1, marginRight: 10 }}
          />
          <CustomInput
            label="Base Fare"
            value={formData.baseFare.toString()}
            onChange={(val) =>
              setFormData({ ...formData, baseFare: parseFloat(val) })
            }
            keyboard="numeric"
            style={{ flex: 1 }}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? "Processing..." : "Register Vehicle"}
          </Text>
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
  keyboard = "default",
  style,
}) => (
  <View style={[styles.inputGroup, style]}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      keyboardType={keyboard}
      placeholderTextColor="#94A3B8"
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
  imageUploadBox: {
    width: "100%",
    height: 200,
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  previewImage: { width: "100%", height: "100%" },
  uploadPlaceholder: { alignItems: "center" },
  uploadText: { marginTop: 10, color: "#64748B", fontWeight: "600" },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF5350",
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 1,
  },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 14, fontWeight: "600", color: "#1E293B", marginBottom: 8 },
  input: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
    color: "#1E293B",
  },
  row: { flexDirection: "row" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  switchLabel: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  submitButton: {
    backgroundColor: "#EF5350",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 50,
  },
  submitButtonText: { color: "#FFF", fontSize: 18, fontWeight: "700" },
});
