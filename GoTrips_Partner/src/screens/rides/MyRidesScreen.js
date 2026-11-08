import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getMyRides } from "api/ridesApi";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyRidesScreen({ navigation }) {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming"); // 'upcoming' or 'past'

  const fetchRides = async () => {
    try {
      const res = await getMyRides();
      console.log(res);

      if (res.success) {
        setRides(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  // Filter rides based on date vs current time
  const filteredRides = rides.filter((ride) => {
    const rideDate = new Date(ride.scheduled_departure_time || ride.created_at);
    const now = new Date();
    return activeTab === "upcoming" ? rideDate >= now : rideDate < now;
  });

  const RideCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: item.ride_status === 'cancelled' ? '#ffeee9' : '#ffffff' }]}
      onPress={() =>
        navigation.navigate("RideDetails", {
          rideId: item.ride_id,
          rideData: item,
        })
      }
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {item.ride_type === "open_ride" ? "OPEN RIDE" : "FIXED ROUTE"}
          </Text>
        </View>
        {item.ride_status == "cancelled" && (
          <Text style={[styles.status, { color: "#d81818" }]}>
            {item.ride_status}
          </Text>
        )}
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.dotContainer}>
          <View style={[styles.dot, { backgroundColor: "#EF5350" }]} />
          <View style={styles.line} />
          <Ionicons name="location" size={16} color="#EF5350" />
        </View>
        <View style={styles.addressContainer}>
          <Text style={styles.addressText} numberOfLines={1}>
            {item.pickup_address}
          </Text>
          <Text
            style={[styles.addressText, { marginTop: 15 }]}
            numberOfLines={1}
          >
            {item.ride_type === "fixed_route"
              ? item.drop_address
              : "Flexible Drop-off"}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={14} color="#64748B" />
          <Text style={styles.footerText}>
            {new Date(item.departure_time || item.created_at).toLocaleString(
              [],
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              },
            )}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={14} color="#64748B" />
          <Text style={styles.footerText}>
            {item._count?.rideBookings || 0}/{item.total_seats} Booked
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Rides</Text>
      </View>

      {/* TAB SWITCHER */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "upcoming" && styles.activeTab]}
          onPress={() => setActiveTab("upcoming")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "upcoming" && styles.activeTabText,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "past" && styles.activeTab]}
          onPress={() => setActiveTab("past")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "past" && styles.activeTabText,
            ]}
          >
            Past Rides({rides.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EF5350" style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={(item) => item.ride_id.toString()}
          renderItem={({ item }) => <RideCard item={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#EF5350"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="car-off"
                size={60}
                color="#CBD5E1"
              />
              <Text style={styles.emptyText}>No {activeTab} rides found</Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateRide")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tab: {
    marginRight: 25,
    paddingBottom: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: "#EF5350" },
  tabText: { fontSize: 15, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#EF5350" },
  listContent: { padding: 20 },
  status: { fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  typeBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { fontSize: 10, fontWeight: "800", color: "#EF5350" },
  price: { fontSize: 18, fontWeight: "800", color: "#1E293B" },
  routeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  dotContainer: { alignItems: "center", marginRight: 15 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { width: 1, height: 20, backgroundColor: "#E2E8F0", marginVertical: 4 },
  addressContainer: { flex: 1 },
  addressText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  footerText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 5,
    fontWeight: "600",
  },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: {
    marginTop: 10,
    color: "#94A3B8",
    fontSize: 16,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#EF5350",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
});
