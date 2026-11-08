import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker"; // Corrected import

import { updateProfileApi, updateProfilePhotoApi } from "../../api/authApi";
import { useAuth } from "../../context/AuthContext"; // Assuming this is your path
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SignUpScreen({ navigation, route }) {
  // Use brackets [] for useState destructuring
  const { authData } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 18);

  const { login } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    gender: "",
    dateOfBirth: new Date(), // Corrected: new Date() instead of Date.now()
  });

  const checkUserType = async (params) => {
    const user = await AsyncStorage.getItem("user");
    if (JSON.parse(user).userType == "passenger") {
      navigation.navigate("DocumentUploader");
    }
  };
  checkUserType();

  const pickImage = async () => {
    // 1. Check existing CAMERA permission status
    const cameraPermission = await ImagePicker.getCameraPermissionsAsync();

    // 2. Request camera permission if not granted yet
    if (cameraPermission.status !== "granted") {
      const requestResult = await ImagePicker.requestCameraPermissionsAsync();
      if (requestResult.status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "We need access to your camera to take a profile picture.",
        );
        return;
      }
    }

    // 3. Launch the Camera directly
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      cameraType: ImagePicker.CameraType.front, // Forces the front (selfie) camera
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0];
      setImage(selectedImage.uri);
      handlePhotoUpload(selectedImage);
    }
  };
  const handlePhotoUpload = async (photoAsset) => {
    const formData = new FormData();
    formData.append("profilePhoto", {
      uri: photoAsset.uri,
      name: "profile.jpg",
      type: "image/jpeg",
    });

    try {
      await updateProfilePhotoApi(formData);
    } catch (err) {
      Alert.alert("Upload Failed", "Could not save profile photo");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    // Hide picker for Android after selection
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setForm({ ...form, dateOfBirth: selectedDate });
    }
  };

  const handleCompleteSignUp = async () => {
    if (!form.fullName || !form.email) {
      return Alert.alert("Required", "Please fill in Name and Email");
    }
    setLoading(true);
    try {
      const res = await updateProfileApi(form);
      if (res.data && res.data.success) {
        // console.log(res);
        console.log(authData);

        // await login(authData);
        Alert.alert("Success", "Profile Created!");
        navigation.replace("ProfileTypeSelect");
      }
    } catch (err) {
      console.log(err);

      // 1. Check if the error response data contains a specific message string
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (typeof err.response?.data === "string" ? err.response.data : null) ||
        err.message ||
        "Something went wrong";

      // 2. Safely display the string message
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <SafeAreaView>
        <Text style={styles.title}>Finish Signing Up</Text>
        <Text style={styles.subtitle}>Tell us a bit more about yourself</Text>

        {/* Profile Photo Picker */}
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.profileImg} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="camera" size={30} color="#64748B" />
            </View>
          )}
          <View style={styles.editIcon}>
            <Ionicons name="pencil" size={14} color="#FFF" />
          </View>
        </TouchableOpacity>

        <CustomInput
          label="Full Name"
          value={form.fullName}
          onChange={(t) => setForm({ ...form, fullName: t })}
          placeholder="John Doe"
        />

        <CustomInput
          label="Email Address"
          value={form.email}
          onChange={(t) => setForm({ ...form, email: t })}
          placeholder="john@example.com"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Date of Birth</Text>
        {/* On Android, you usually need a button to trigger the picker */}
        {Platform.OS === "android" && (
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowDatePicker(true)}
          >
            <Text>{form.dateOfBirth.toDateString()}</Text>
          </TouchableOpacity>
        )}

        {(showDatePicker || Platform.OS === "ios") && (
          <DateTimePicker
            value={form.dateOfBirth || maxDate}
            mode="date"
            maximumDate={maxDate}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
          />
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>Gender</Text>
        <View style={styles.genderRow}>
          {["male", "female", "other"].map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.genderBtn,
                form.gender === g && styles.genderBtnActive,
              ]}
              onPress={() => setForm({ ...form, gender: g })}
            >
              <Text
                style={[
                  styles.genderText,
                  form.gender === g && { color: "#FFF" },
                ]}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleCompleteSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitText}>Complete Sign Up</Text>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </ScrollView>
  );
}

// Reusable Input Component
const CustomInput = ({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
}) => (
  <View style={{ marginBottom: 20 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", padding: 25 },
  title: { fontSize: 26, fontWeight: "bold", color: "#1E293B" },
  subtitle: { color: "#64748B", marginBottom: 30 },
  label: { fontSize: 14, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
  },
  photoContainer: { alignSelf: "center", marginBottom: 30 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderStyle: "dashed",
  },
  profileImg: { width: 100, height: 100, borderRadius: 50 },
  editIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#EF5350",
    padding: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  genderRow: { flexDirection: "row", gap: 10, marginBottom: 30 },
  genderBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  genderBtnActive: { backgroundColor: "#EF5350", borderColor: "#EF5350" },
  genderText: { fontWeight: "600", color: "#64748B" },
  submitBtn: {
    backgroundColor: "#EF5350",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  submitText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
});
