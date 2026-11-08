import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Switch } from "react-native-switch"; // Modern Switch Library
import { getMyVehicles, updateVehicleAvailability } from "api/vehiclesApi";

export default function MyFleetScreen({ navigation }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const fetchVehicles = async () => {
    try {
      const response = await getMyVehicles();
      if (response.success) {
        setVehicles(response.data || []);
      }
    } catch (error) {
      console.error("Fetch Fleet Error:", error);
      Alert.alert("Error", "Failed to load vehicles.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehicles();
  };

  const filteredVehicles = useMemo(() => {
    let result = [...vehicles];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.manufacturer?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query) ||
          v.number_plate?.toLowerCase().includes(query)
      );
    }
    result.sort((a, b) => {
      const priceA = parseFloat(a.rental_pricePerDay || a.price) || 0;
      const priceB = parseFloat(b.rental_pricePerDay || b.price) || 0;
      if (sortBy === "price_high") return priceB - priceA;
      if (sortBy === "price_low") return priceA - priceB;
      return 0;
    });
    return result;
  }, [vehicles, searchQuery, sortBy]);

  const toggleSwitch = async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Optimistic UI Update
    setVehicles((prev) =>
      prev.map((v) =>
        v.vehicle_id === id ? { ...v, is_available: newStatus } : v
      )
    );

    try {
      const response = await updateVehicleAvailability(id, {
        is_available: newStatus,
      });
      if (!response.success) throw new Error();
    } catch (error) {
      Alert.alert("Error", "Could not update availability.");
      // Rollback
      setVehicles((prev) =>
        prev.map((v) =>
          v.vehicle_id === id ? { ...v, is_available: currentStatus } : v
        )
      );
    }
  };

  if (loading && vehicles.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#EF5350" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Vehicles</Text>
        <View style={styles.headerIcons}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={16} color="#94A3B8" />
            <TextInput
              placeholder="Search..."
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSortBy(sortBy === "price_high" ? "price_low" : "price_high")}
          >
            <Feather
              name="sliders"
              size={22}
              color={sortBy !== "default" ? "#EF5350" : "#334155"}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollBody}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#EF5350"]} />}
      >
        {/* STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>AVAILABLE</Text>
            <Text style={styles.statValue}>{vehicles.filter((v) => v.is_available).length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>TOTAL FLEET</Text>
            <Text style={styles.statValue}>{vehicles.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Registered Vehicles</Text>

        {filteredVehicles.map((item) => (
          <TouchableOpacity
            key={item.vehicle_id}
            style={styles.vehicleCard}
            onPress={() => navigation.navigate("VehicleDetails", { vehicleId: item.vehicle_id })}
          >
            <Image
              source={{ uri: item.vehicle_photos?.[0] || "https://via.placeholder.com/150" }}
              style={styles.vehicleImage}
            />

            <View style={styles.vehicleInfo}>
              <View style={styles.rowBetween}>
                <Text style={[styles.vehicleName, { color: item.is_available ? "#1E293B" : "#64748B" }]}>
                  {item.manufacturer} {item.model}
                </Text>
              </View>

              <Text style={styles.vehicleSub}>{item.number_plate} • {item.vehicle_category}</Text>

              <View style={styles.rowBetween}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: item.is_available ? "#22C55E" : "#94A3B8" }]} />
                  <Text style={[styles.statusLabel, { color: item.is_available ? "#22C55E" : "#94A3B8" }]}>
                    {item.is_available ? "AVAILABLE" : "INACTIVE"}
                  </Text>
                  <Text style={[styles.statusLabel, { color: "#64748B", marginLeft: 8 }]}> Trips: {item.total_trips} </Text>
                </View>

                {/* MODERN SWITCH COMPONENT */}
                <Switch
                  value={item.is_available}
                  onValueChange={() => toggleSwitch(item.vehicle_id, item.is_available)}
                  disabled={false}
                  activeText={'On'}
                  inActiveText={'Off'}
                  circleSize={22}
                  barHeight={26}
                  circleBorderWidth={0}
                  backgroundActive={'#EF5350'}
                  backgroundInactive={'#E2E8F0'}
                  circleActiveColor={'#FFFFFF'}
                  circleInActiveColor={'#FFFFFF'}
                  changeValueImmediately={true}
                  innerCircleStyle={{ alignItems: "center", justifyContent: "center" }} 
                  renderActiveText={false}
                  renderInActiveText={false}
                  switchLeftPx={2} 
                  switchRightPx={2} 
                  switchWidthMultiplier={2.2} 
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("AddVehicle")}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  headerIcons: { flexDirection: "row", alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 10,
    width: 140,
  },
  searchInput: {
    paddingVertical: 6,
    paddingHorizontal: 5,
    fontSize: 14,
    color: '#334155',
    flex: 1
  },
  iconBtn: { marginLeft: 12 },
  scrollBody: { padding: 20, paddingBottom: 100 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },
  statCard: {
    width: "48%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    elevation: 2,
  },
  statLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 1 },
  statValue: { fontSize: 28, fontWeight: "800", color: "#1E293B", marginTop: 4 },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#334155", marginBottom: 15 },
  vehicleCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  vehicleImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F1F5F9' },
  vehicleInfo: { flex: 1, marginLeft: 15, justifyContent: "space-between" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vehicleName: { fontSize: 16, fontWeight: "700" },
  vehicleSub: { fontSize: 12, color: "#64748B" },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 25,
    backgroundColor: "#EF5350",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#EF5350",
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});