import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { getRideDetails, canelRide } from "api/ridesApi";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RideDetailsScreen({ route, navigation }) {
  const { rideId, rideData } = route.params;
  const [ride, setRide] = useState(rideData || null);
  const [loading, setLoading] = useState(false);

  //   useEffect(() => {
  //     fetchRide();
  //   }, []);

  //   const fetchRide = async () => {
  //     try {
  //       const res = await getRideDetails(rideId);
  //       if (res.success) setRide(res.data);
  //     } catch (err) {
  //       Alert.alert("Error", "Could not load ride details");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  const handleDelete = () => {
    Alert.alert(
      "Delete Ride",
      "Are you sure you want to delete this ride? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await canelRide(rideId);
              Alert.alert("Success", "Ride deleted successfully");
              navigation.goBack();
            } catch (err) {
              Alert.alert("Error", "Failed to delete ride");
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my ride from ${ride.pickup_address} to ${ride.drop_address || "Open Destination"}!`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1 }} color="#EF5350" size="large" />
    );
  if (!ride)
    return (
      <View style={styles.center}>
        <Text>Ride not found</Text>
      </View>
    );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={{ marginRight: 15 }}>
            <Ionicons name="share-social-outline" size={22} color="#1E293B" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color="#EF5350" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={false}
      >
        {/* STATUS CARD */}
        <View style={styles.statusCard}>
          <View>
            <Text style={styles.statusLabel}>RIDE STATUS</Text>
            <Text style={styles.statusValue}>
              {ride.ride_type.toUpperCase()} ROUTE
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
              {ride.ride_type !== "fixed_route"
                ? "Flexible / Open Ride"
                : "Fixed Route"}
            </Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{ride.fare}</Text>
          </View>
          <Text style={styles.created_at_label}>Created On:</Text>
          <Text style={styles.created_at}>
            {new Date(ride.created_at).toLocaleString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>

        {/* ROUTE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ITINERARY</Text>
          <View style={styles.routeBox}>
            <View style={styles.visualRoute}>
              <View style={styles.dotRed} />
              <View style={styles.line} />
              <Ionicons name="location" size={20} color="#EF5350" />
            </View>
            <View style={styles.addressBox}>
              <Text style={styles.addressTitle}>{ride.ride_type === "fixed_route"?"Pickup":"Current Address:"}</Text>
              <Text style={styles.addressSub}>{ride.pickup_address}</Text>
              <View style={{ height: 30 }} />
              <Text style={styles.addressTitle}>Destination</Text>
              <Text style={styles.addressSub}>
                {ride.ride_type === "fixed_route"
                  ? ride.drop_address
                  : "Flexible / Open Ride"}
              </Text>
            </View>
          </View>
        </View>

        {/* DETAILS GRID */}
        <View style={styles.grid}>
          <DetailItem
            icon="calendar"
            label="Traveling Date"
            value={new Date(ride.scheduled_departure_time).toLocaleDateString(
              [],
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )}
          />
          <DetailItem
            icon="time"
            label="Traveling Time"
            value={new Date(ride.scheduled_departure_time).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          />
          <DetailItem
            icon="people"
            label="Seats"
            value={`${ride._count?.rideBookings || 0}/${ride.total_seats} Filled`}
          />
          <DetailItem
            icon="car"
            label="Vehicle"
            value={ride.vehicle?.model || "Standard"}
          />
          <DetailItem
            icon="logo-markdown"
            label="Vehicle Number"
            value={ride.vehicle?.number_plate || "Not Provided"}
          />
        </View>

        {/* PREFERENCES */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={styles.chipRow}>
            {Object.entries(ride.preferences || {}).map(
              ([key, val]) =>
                val && (
                  <View key={key} style={styles.chip}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#22C55E"
                    />
                    <Text style={styles.chipText}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </Text>
                  </View>
                ),
            )}
          </View>
        </View>

        {/* NOTES */}
        {ride.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PARTNER NOTES</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{ride.notes}</Text>
            </View>
          </View>
        )}

        {/* EDIT BUTTON */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() =>
            navigation.navigate("UpdateRide", {
              ride: ride,
              isEditing: true,
            })
          }
        >
          <MaterialCommunityIcons name="pencil" size={20} color="#FFF" />
          <Text style={styles.editBtnText}>Edit Ride Details</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const DetailItem = ({ icon, label, value }) => (
  <View style={styles.gridItem}>
    <Ionicons name={icon} size={20} color="#EF5350" />
    <Text style={styles.gridLabel}>{label}</Text>
    <Text style={styles.gridValue}>{value}</Text>
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
  headerActions: { flexDirection: "row", alignItems: "center" },
  scrollBody: { padding: 20 },
  statusCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  statusLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  statusValue: { color: "#FFF", fontSize: 18, fontWeight: "800", marginTop: 4 },
  priceBadge: {
    backgroundColor: "#EF5350",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
  },
  priceText: { color: "#FFF", fontWeight: "800", fontSize: 20 },
  created_at_label: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
    position: "absolute",
    bottom: 25,
    right: 72,
  },

  created_at: {
    color: "#bbc5d3",
    fontSize: 12,
    marginTop: 4,
    position: "absolute",
    bottom: 10,
    right: 15,
  },
  section: { marginBottom: 25 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
    marginBottom: 15,
    letterSpacing: 1,
  },
  routeBox: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
  },
  visualRoute: { alignItems: "center", marginRight: 20 },
  dotRed: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EF5350",
  },
  line: { width: 2, flex: 1, backgroundColor: "#228533ad", marginVertical: 5 },
  addressTitle: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  addressSub: {
    fontSize: 15,
    color: "#1E293B",
    fontWeight: "600",
    marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 25 },
  gridItem: {
    width: "48%",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  gridLabel: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 5,
    fontWeight: "600",
  },
  gridValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "700",
    marginTop: 2,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  chipText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  notesBox: { backgroundColor: "#F1F5F9", padding: 15, borderRadius: 12 },
  notesText: { color: "#475569", lineHeight: 20 },
  editBtn: {
    backgroundColor: "#EF5350",
    flexDirection: "row",
    padding: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
  },
  editBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 10,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
