import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { partnerProfileAPI } from "api/partnerProfileApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PARTNER_OPTIONS = [
  {
    id: "vehicle_service",
    title: "Vehicle service provider",
    description:
      "Provide standard commercial transport and point-to-point rides.",
    icon: "car",
    iconType: "fa5",
    color: "#EF5350",
  },
  {
    id: "vehicle_rental",
    title: "Vehicle rent service provider",
    description: "Rent out your single vehicle or asset fleet to active users.",
    icon: "key",
    iconType: "fa5",
    color: "#42A5F5",
  },
  {
    id: "vehicle_driver",
    title: "Vehicle Driver",
    description:
      "Drive on fixed shifts or custom schedules matching system requests.",
    icon: "id-card",
    iconType: "fa5",
    color: "#66BB6A",
  },
  {
    id: "marketplace_driver",
    title: "Listing as Driver at marketplace",
    description:
      "Get discovered directly by clients. Premium listing parameters apply.",
    feeText: "Requires ₹49 listing fee",
    icon: "store",
    iconType: "fa5",
    color: "#AB47BC",
  },
];

export default function PartnerTypeScreen({ navigation }) {
  const [selectedType, setSelectedType] = useState(null);
  const [businessName, setBusinessName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkUserType = async (params) => {
    const user = await AsyncStorage.getItem('user') 
    if (JSON.parse(user).userType == "passenger") {
      navigation.navigate("DocumentUploader", { type: selectedType });
    } 
  }
  checkUserType();

  // Opens the pop-up sheet once they tap Continue on a selection
  const handleContinue = () => {
    if (!selectedType) {
      Alert.alert(
        "Selection Required",
        "Please select a partner type to continue.",
      );
      return;
    }

    if (selectedType === "marketplace_driver") {
      console.log("Trigger ₹49 listing fee pipeline");
      // Add Razorpay or external billing transitions here if needed
    }

    setIsModalVisible(true);
  };

  // Submits the finalized values to the database service
  const handleConfirmRegistration = async () => {
    if (!businessName.trim()) {
      Alert.alert("Required", "Please enter your Business Name.");
      return;
    }

    setIsModalVisible(false);
    setLoading(true);
    console.log(selectedType);
    console.log(businessName);

    try {
      const payload = {
        partnerType: selectedType,
        businessName: businessName.trim(),
      };

      const response = await partnerProfileAPI.registerPartner(payload);
      if (response.data) {
        Alert.alert(
          "Success",
          "Partner registration successful. Verification pending.",
        );
        setBusinessName("");
        setSelectedType(null);
        if (selectedType === "marketplace_driver") {
          navigation.navigate("MarketplaceDriver", { type: selectedType });
        }
        navigation.navigate("DocumentUploader", { type: selectedType });
      }
    } catch (error) {
      // console.log("Partner registration failed:", error);
      // const errorMsg =
      //   error.response?.data?.message ||
      //   error.response?.data?.error ||
      //   "Failed to register partner profile. Please try again.";
      console.log(error);

      Alert.alert(
        "Registration Error",
        error.response?.data?.message ||
          "Failed to register partner profile. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Registration</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress Bar Container */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTextRow}>
          <Text style={styles.progressLabel}>Step 2: Partner Type</Text>
          <Text style={styles.progressSteps}>2 of 5</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: "40%" }]} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        <Text style={styles.mainTitle}>How will you earn with RideFlow?</Text>
        <Text style={styles.subtitle}>
          Select the option that best describes your service.
        </Text>

        {/* Options Stack */}
        {PARTNER_OPTIONS.map((option) => {
          const isSelected = selectedType === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.8}
              style={[
                styles.optionCard,
                isSelected && styles.optionCardSelected,
              ]}
              onPress={() => setSelectedType(option.id)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: option.color + "15" },
                ]}
              >
                <FontAwesome5
                  name={option.icon}
                  size={20}
                  color={option.color}
                />
              </View>

              <View style={styles.textBlock}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>
                  {option.description}
                </Text>

                {option.feeText && (
                  <View style={styles.feeBadge}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color="#E65100"
                    />
                    <Text style={styles.feeBadgeText}>{option.feeText}</Text>
                  </View>
                )}
              </View>

              <View style={styles.checkArea}>
                <Ionicons
                  name={
                    isSelected ? "checkmark-circle" : "radio-button-off-outline"
                  }
                  size={24}
                  color={isSelected ? "#EF5350" : "#E2E8F0"}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Global Action Loader overlay visual */}
        {loading && (
          <ActivityIndicator
            size="large"
            color="#EF5350"
            style={{ marginTop: 10 }}
          />
        )}

        <TouchableOpacity style={styles.helpLink}>
          <Ionicons
            name="help-circle"
            size={16}
            color="#EF5350"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.helpLinkText}>Need help choosing?</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Sticky Action Footer Panel */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </TouchableOpacity>
        <Text style={styles.footerBrand}>DRIVER SAFETY FIRST • RIDEFLOW</Text>
      </View>

      {/* Bottom Pop-up Sheet Modal for entering Business Name */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalContent}
              >
                <View style={styles.sheetHandle} />

                <Text style={styles.modalTitle}>Complete Profile Setup</Text>
                <Text style={styles.modalSubtitle}>
                  Please declare your legal trading firm or personal name to
                  complete registration.
                </Text>

                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Nexus Logistics"
                  placeholderTextColor="#94A3B8"
                  autoFocus={true}
                  autoCapitalize="words"
                />

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleConfirmRegistration}
                >
                  <Text style={styles.confirmBtnText}>Confirm & Register</Text>
                </TouchableOpacity>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justify: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },

  progressContainer: { paddingHorizontal: 20, marginTop: 5 },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  progressSteps: { fontSize: 14, color: "#64748B", fontWeight: "500" },
  progressBarTrack: {
    height: 4,
    width: "100%",
    backgroundColor: "#FFEBEE",
    borderRadius: 2,
  },
  progressBarFill: { height: 4, backgroundColor: "#EF5350", borderRadius: 2 },

  scrollBody: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 40 },
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1E293B",
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 25,
  },

  optionCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#EF5350",
    borderWidth: 2,
    shadowColor: "#EF5350",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justify: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textBlock: { flex: 1, paddingRight: 8 },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  optionDescription: { fontSize: 13, color: "#64748B", lineHeight: 18 },

  feeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  feeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#E65100",
    marginLeft: 4,
  },

  checkArea: { justifyContent: "center", alignItems: "center" },
  helpLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  helpLinkText: { color: "#EF5350", fontWeight: "600", fontSize: 14 },

  footer: {
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
    backgroundColor: "#FFF",
  },
  continueBtn: {
    backgroundColor: "#EF5350",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justify: "center",
    width: "100%",
  },
  continueBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  footerBrand: {
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 15,
    letterSpacing: 0.5,
  },

  // Modal Sheet Positioning Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 25,
    paddingTop: 15,
    paddingBottom: Platform.OS === "ios" ? 40 : 25,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#CBD5E1",
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#000",
    marginBottom: 25,
  },
  confirmBtn: {
    backgroundColor: "#EF5350",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "bold" },
});
