import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { partnerProfileAPI } from "api/partnerProfileApi";
import asyncStorage from "@react-native-async-storage/async-storage";
import { useAuth, updatePartnerData} from "context/AuthContext";
import { updateUserOnboarding } from "api/userApi";

// Required documents configuration schema
const REQUIRED_DOCUMENTS = [
  { id: "driving_license", label: "Driving License", type: "Required" },
  //   { id: "aadhaar", label: "Aadhaar Card / ID Proof", type: "Required" },
  //   { id: "pan", label: "PAN Card", type: "Required" },
  //   { id: "vehicle_rc", label: "Vehicle Registration (RC)", type: "Optional" },
];

export default function DocumentUploadScreen({ navigation }) {
  const [loading, setLoading] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState({});
  const { user, completeProfile, updatePartnerData } = useAuth();



  // Action Sheet Selector State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [activeTargetDocId, setActiveTargetDocId] = useState(null);

  // Triggers Action Sheet configuration window open overlay
  const openSourceSelector = (docId) => {
    setActiveTargetDocId(docId);
    setPickerModalVisible(true);
  };

  // Central Image Picker Processor handling native core camera threads
  const processImageSelection = async (sourceType) => {
    const docId = activeTargetDocId;
    setPickerModalVisible(false); // Close action prompt overlay immediately

    if (!docId) return;

    try {
      // 1. Request Runtime Hardware System Permissions
      if (sourceType === "camera") {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraStatus.granted) {
          Alert.alert(
            "Permission Denied",
            "RideFlow requires camera permissions to capture document photos.",
          );
          return;
        }
      } else {
        const libraryStatus =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!libraryStatus.granted) {
          Alert.alert(
            "Permission Denied",
            "RideFlow requires access to your photo library to select documents.",
          );
          return;
        }
      }

      setLoading((prev) => ({ ...prev, [docId]: true }));

      // 2. Launch Native Operating System Threads
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3], // Document frame format scale layout
        quality: 0.7, // Compression engine configuration optimizer
      };

      const result =
        sourceType === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled) {
        setLoading((prev) => ({ ...prev, [docId]: false }));
        return;
      }

      const fileAsset = result.assets[0];

      // 3. Process stream package upload to server API endpoint
      await uploadDocumentToServer(docId, fileAsset);
    } catch (err) {
      console.error("Document picking loop exception: ", err);
      Alert.alert("Error", "Failed to access system image capture services.");
    } finally {
      setLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // Multipart HTTP Request Payload stream handler
  const uploadDocumentToServer = async (docId, fileAsset) => {
    const localUri = fileAsset.uri;
    const filename = localUri.split("/").pop();

    // Deduce file type extension parameters safely from URI values
    const match = /\.(\w+)$/.exec(filename || "");
    const fileMimeType = match ? `image/${match[1]}` : `image/jpeg`;

    const formData = new FormData();

    // CRITICAL FIX: The key must be the dynamic document type (e.g., 'driving_license')
    // so that your backend Object.entries(req.files) reads it properly.
    formData.append(docId, {
      uri: localUri,
      name: filename || `${docId}_upload.jpg`,
      type: fileAsset.mimeType || fileMimeType,
    });

    try {
      // CRITICAL FIX: You must pass the partner's unique ID to the route params!
      // Get this ID from your AuthContext or user context (e.g., user.partnerId)
      const getPartnerId = await partnerProfileAPI.getProfileByUserId(user?.id,
      );
      const partnerId = getPartnerId.data.data.partner_id;
      const response = await partnerProfileAPI.uploadDocuments(
        formData,
        partnerId,
      );
      if (response.data.success) {
        setUploadedDocs((prev) => ({
          ...prev,
          [docId]: {
            name: filename || `${docId}_file.jpg`,
            uploadedAt: new Date().toLocaleDateString(),
          },
        }));
      }
    } catch (err) {
      console.log("Backend error trace:", err.response?.data || err.message);
      Alert.alert(
        "Upload Failure",
        err.response?.data?.message || "Network server refused payload stream.",
      );
    }
  };
  const handleFinishRegistration = () => {
    const missingRequired = REQUIRED_DOCUMENTS.filter(
      (doc) => doc.type === "Required" && !uploadedDocs[doc.id],
    );

    if (missingRequired.length > 0) {
      Alert.alert(
        "Incomplete Verification",
        `Please upload missing required files:\n${missingRequired.map((d) => `• ${d.label}`).join("\n")}`,
      );
      return;
    }

    Alert.alert(
      "Registration Complete",
      "Documents submitted successfully for partner review!",
      [
        {
          text: "Finish Setup",
          onPress: async () => {
            const updateProfileOnboarding = await updateUserOnboarding(user?.id);
            const getPartnerId = await partnerProfileAPI.getProfileByUserId(user?.id);
            if (updateProfileOnboarding.status !== 200) {
              Alert.alert(
                "Profile Update Error",
                "Failed to update profile onboarding status."
              );
            }
            //  user
            await completeProfile();
            await updatePartnerData(getPartnerId.data.data);
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header element bar setup */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Partner Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
      >
        <Text style={styles.mainTitle}>Upload Documents</Text>
        <Text style={styles.subtitle}>
          Provide valid, clear, unblurred digital assets to activate your driver
          status.
        </Text>

        {/* Dynamic Card Generation Mapping Loop */}
        {REQUIRED_DOCUMENTS.map((doc) => {
          const fileData = uploadedDocs[doc.id];
          const isDocLoading = loading[doc.id];

          return (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docHeader}>
                <View style={styles.docLabelRow}>
                  <Text style={styles.docTitle}>{doc.label}</Text>
                  <Text
                    style={[
                      styles.typeTag,
                      doc.type === "Required"
                        ? styles.requiredTag
                        : styles.optionalTag,
                    ]}
                  >
                    {doc.type}
                  </Text>
                </View>

                {fileData && (
                  <View style={styles.successBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#10B981"
                    />
                    <Text style={styles.successBadgeText}>Ready</Text>
                  </View>
                )}
              </View>

              {fileData ? (
                <View style={styles.fileInfoBlock}>
                  <Ionicons
                    name="document-text"
                    size={24}
                    color="#64748B"
                    style={{ marginRight: 10 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {fileData.name}
                    </Text>
                    <Text style={styles.fileMeta}>
                      Uploaded: {fileData.uploadedAt}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openSourceSelector(doc.id)}
                    style={styles.reuploadBtn}
                  >
                    <Text style={styles.reuploadBtnText}>Replace</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.uploadArea}
                  onPress={() => openSourceSelector(doc.id)}
                  disabled={isDocLoading}
                >
                  {isDocLoading ? (
                    <ActivityIndicator size="small" color="#EF5350" />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={24}
                        color="#EF5350"
                        style={{ marginBottom: 6 }}
                      />
                      <Text style={styles.uploadActionText}>
                        Tap to add document scan file
                      </Text>
                      <Text style={styles.uploadFormatText}>
                        Supports crisp high-contrast device camera photos
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* --- INTEGRATED CAMERA/GALLERY ACTION PROMPT SHEET --- */}
      <Modal visible={pickerModalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Select Document Input Channel</Text>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => processImageSelection("camera")}
            >
              <Ionicons
                name="camera"
                size={22}
                color="#EF5350"
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>
                Snap Photo (Launch System Camera)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOption}
              onPress={() => processImageSelection("gallery")}
            >
              <Ionicons
                name="images"
                size={22}
                color="#EF5350"
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>
                Choose from System Storage Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.cancelText}>Dismiss Menu</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Baseline Fixed Submit Drawer section panel layout */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleFinishRegistration}
        >
          <Text style={styles.submitBtnText}>Submit Documents</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  scrollBody: { paddingHorizontal: 20, paddingTop: 25, paddingBottom: 40 },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 25,
  },

  // Card elements styling constraints setup
  docCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 16,
  },
  docHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  docLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  docTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  typeTag: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredTag: { backgroundColor: "#FFEBEE", color: "#EF5350" },
  optionalTag: { backgroundColor: "#F1F5F9", color: "#64748B" },

  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  successBadgeText: { fontSize: 11, fontWeight: "700", color: "#10B981" },

  // Dashed selection viewport triggers config box parameters
  uploadArea: {
    borderWidth: 1.5,
    borderColor: "#FFCDD2",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#FFF8F8",
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#EF5350",
    marginBottom: 2,
  },
  uploadFormatText: { fontSize: 11, color: "#94A3B8" },

  // Populated item presentation nodes layouts definitions
  fileInfoBlock: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fileName: { fontSize: 14, fontWeight: "600", color: "#334155" },
  fileMeta: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  reuploadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  reuploadBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },

  // UI Action Drawer layouts settings options styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 20,
    textAlign: "center",
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionIcon: { marginRight: 12 },
  optionText: { fontSize: 15, fontWeight: "600", color: "#334155" },
  cancelButton: { alignItems: "center", padding: 15, marginTop: 5 },
  cancelText: { color: "#64748B", fontWeight: "700", fontSize: 15 },

  footer: {
    borderTopWidth: 1,
    borderColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 25,
    backgroundColor: "#FFF",
  },
  submitBtn: {
    backgroundColor: "#EF5350",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
