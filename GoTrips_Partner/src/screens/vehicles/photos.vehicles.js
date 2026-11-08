import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { uploadVehiclePhotos, deleteVehiclePhoto } from "api/vehiclesApi";

export default function UpdatePhotosScreen({ route, navigation }) {
  const { vehicleId, existingPhotos } = route.params;
  const [photos, setPhotos] = useState(existingPhotos || []);
  const [uploading, setUploading] = useState(false);



  const handleUpload = async (uris) => {
    setUploading(true);
    try {
      // Assuming uploadVehiclePhotos is imported from your api file
      const res = await uploadVehiclePhotos(vehicleId, uris);
      if (res.success) {
        setPhotos(res.data.vehicle_photos);
        Alert.alert("Success", "Photos uploaded successfully");
      }
    } catch (err) {
      Alert.alert("Upload Error", "Could not upload images to server.");
    } finally {
      setUploading(false);
    }
  };
  // 1. Handle Image Selection & Upload
  const pickAndUploadImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map((asset) => asset.uri);
      handleUpload(selectedUris);
    }
  };

  // 2. Handle Photo Deletion
  const handleDelete = async (index) => {
    Alert.alert("Delete Photo", "Are you sure you want to remove this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await deleteVehiclePhoto(vehicleId, index);
            if (res.success) {
              // Local update: filter out the deleted index
              setPhotos((prev) => prev.filter((_, i) => i !== index));
            }
          } catch (err) {
            Alert.alert("Error", "Could not delete photo");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Photos</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={photos}
        keyExtractor={(item, index) => index.toString()}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: item }} style={styles.image} />
            <TouchableOpacity
              style={styles.deleteBadge}
              onPress={() => handleDelete(index)}
            >
              <Ionicons name="trash-bin" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      />
      <TouchableOpacity
        style={styles.uploadBtn}
        onPress={pickAndUploadImage}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#EF5350" />
        ) : (
          <>
            <Ionicons name="camera" size={24} color="#EF5350" />
            <Text style={styles.uploadText}>Add Photos</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  listContent: { padding: 10 },
  imageWrapper: {
    flex: 1,
    margin: 8,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#DDD",
  },
  image: { width: "100%", height: "100%" },
  deleteBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(239, 83, 80, 0.9)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadBtn: {
    margin: 8,
    height: 90,
    borderWeight: 2,
    borderStyle: "dashed",
    borderColor: "#CBD5E1",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    flex: 1,
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
  },
  uploadText: { color: "#EF5350", fontWeight: "600", marginTop: 8 },
});
