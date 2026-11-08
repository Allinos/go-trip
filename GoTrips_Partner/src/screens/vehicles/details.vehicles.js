import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { getVehicleDetails, deleteVehicle } from "api/vehiclesApi";

const { width } = Dimensions.get("window");

export default function VehicleDetailsScreen({ route, navigation }) {
  const { vehicleId } = route.params;
  const [activeIndex, setActiveIndex] = useState(0);
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [vehicleId]);
  const fetchDetails = async () => {
    try {
      const response = await getVehicleDetails(vehicleId);
      if (response.success) {
        setVehicle(response.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeleteVehicle = () => {
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await deleteVehicle(vehicle.vehicle_id);

              if (res.success) {
                Alert.alert("Success", "Vehicle deleted successfully");
                navigation.goBack();
              }
            } catch (err) {
              Alert.alert("Error", "Failed to delete vehicle");
            }
          },
        },
      ],
    );
  };

  const formatPrice = (priceObj) => {
    if (!priceObj || !priceObj.d) return "0.00";
    const val = priceObj.d[0];
    const decimal = priceObj.d[1]
      ? `.${priceObj.d[1].toString().substring(0, 2)}`
      : ".00";
    return `${val}${decimal}`;
  };
  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  if (loading && !refreshing) {
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#EF5350" />
    );
  }
  if (!vehicle) return <Text>Vehicle not found</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#334155" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vehicle Details</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("EditVehicle", {
              vehicleId: vehicle.vehicle_id,
            })
          }
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#EF5350"]}
          />
        }
      >
        {/* IMAGE */}
        <View style={styles.imageContainer}>
          <FlatList
            data={
              vehicle.vehicle_photos?.length
                ? vehicle.vehicle_photos
                : ["https://via.placeholder.com/400x250"]
            }
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / width,
              );
              setActiveIndex(index);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.sliderImage} />
            )}
          />

          {/* STATUS BADGE */}

          {/* PAGINATION DOTS */}
          <View style={styles.pagination}>
            {(vehicle.vehicle_photos?.length
              ? vehicle.vehicle_photos
              : [1]
            ).map((_, index) => (
              <View
                key={index}
                style={[styles.dot, activeIndex === index && styles.activeDot]}
              />
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* TITLE */}
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.vName}>
                {vehicle.manufacturer} {vehicle.model}
              </Text>

              <Text style={styles.vPlate}>
                {vehicle.number_plate} • {vehicle.year}
              </Text>
            </View>

            <MaterialCommunityIcons
              name={vehicle.is_verified ? "shield-check" : "shield-alert"}
              size={22}
              color={vehicle.is_verified ? "#22C55E" : "#F59E0B"}
            />
            <Text style={styles.is_verified} >{vehicle.is_verified? "verified" : "un-verified"}</Text>
          </View>

          {/* QUICK STATS */}
          <View style={styles.statsRow}>
            <StatItem
              icon="users"
              label="Capacity"
              val={`${vehicle.seating_capacity} Seats`}
            />

            <StatItem icon="gas-pump" label="Fuel" val={vehicle.fuel_type} />

            <StatItem
              icon="snowflake"
              label="AC"
              val={vehicle.ac_available ? "Yes" : "No"}
            />
            <View style={styles.statItem}>
              <FontAwesome5 name="car-side" size={18} color="#EF5350" />
              <Text
                style={[
                  styles.statLabel,
                  { color: vehicle.is_available ? "#22C55E" : "#F59E0B" },
                ]}
              >
                Available
              </Text>
              <Text style={styles.statVal}>
                {vehicle.is_available ? "Yes" : "No"}
              </Text>
            </View>
          </View>

          {/* VEHICLE INFO */}
          <Text style={styles.sectionLabel}>VEHICLE INFORMATION</Text>

          <View style={styles.infoBox}>
            <InfoItem label="Vehicle Type" value={vehicle.vehicle_type} />
            <InfoItem label="Category" value={vehicle.vehicle_category} />
            <InfoItem label="Color" value={vehicle.color} />
            <InfoItem label="Total Trips" value={vehicle.total_trips} />
            <InfoItem
              label="Rating"
              value={vehicle.rating_average?.d?.[0] || 0}
            />
          </View>

          {/* PRICING */}
          <Text style={styles.sectionLabel}>PRICING DETAILS</Text>

          <View style={styles.priceGrid}>
            <PriceCard
              label="Daily"
              price={formatPrice(vehicle.rental_price_per_day)}
            />

            <PriceCard
              label="Hourly"
              price={formatPrice(vehicle.rental_price_per_hour)}
            />

            <PriceCard
              label="Per KM"
              price={formatPrice(vehicle.ride_price_per_km)}
            />

            <PriceCard
              label="Base Fare"
              price={formatPrice(vehicle.base_fare)}
            />
          </View>

          {/* FEATURES */}
          <Text style={styles.sectionLabel}>FEATURES</Text>

          <View style={styles.featureList}>
            {vehicle.features?.map((f, i) => (
              <View key={i} style={styles.featureTag}>
                <Ionicons name="checkmark-circle" size={16} color="#EF5350" />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          {/* OWNER */}
          <Text style={styles.sectionLabel}>BUSINESS OWNER</Text>

          <View style={styles.partnerCard}>
            <View>
              <Text style={styles.bizName}>
                {vehicle.partner.business_name}
              </Text>

              <Text style={styles.phone}>
                {vehicle.partner.user.phone_number}
              </Text>
            </View>

            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* UPDATE & DELETE BUTTON */}
          <TouchableOpacity
            style={[styles.editBtn]}
            onPress={() =>
              navigation.navigate("EditVehicle", {
                vehicleId: vehicle.vehicle_id,
              })
            }
          >
            <Ionicons name="refresh-circle-sharp" size={24} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 18 }}>
              Edit
            </Text>
          </TouchableOpacity>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={[styles.updatePhotoBtn]}
              onPress={() =>
                navigation.navigate("UpdatePhotos", {
                  vehicleId: vehicle.vehicle_id,
                  existingPhotos: vehicle.vehicle_photos,
                })
              }
            >
              <MaterialCommunityIcons
                name={"image-edit"}
                size={28}
                color="#0549a1"
              />
              <Text style={styles.updatePhotoBtnText}> Update</Text>
              <Text style={styles.updatePhotoBtnText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDeleteVehicle}
            >
              <Ionicons name="trash-outline" size={24} color="#ff1f1f" />
              <Text style={styles.deleteText}>Delete Vehicle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatItem = ({ icon, label, val }) => (
  <View style={styles.statItem}>
    <FontAwesome5 name={icon} size={18} color="#EF5350" />
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statVal}>{val}</Text>
  </View>
);

const PriceCard = ({ label, price }) => (
  <View style={styles.priceCard}>
    <Text style={styles.pLabel}>{label}</Text>
    <Text style={styles.pAmount}>${price}</Text>
  </View>
);

const InfoItem = ({ label, value }) => (
  <View style={styles.infoItem}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },

  headerTitle: { fontSize: 18, fontWeight: "700" },

  imageContainer: { height: 250 },
  sliderImage: {
    width: width - 10,
    height: 250,
    resizeMode: "contain",
    marginHorizontal: 5,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: "#F1F5F9",
  },

  imageContainer: {
    height: 250,
    width: "100%",
  },

  pagination: {
    position: "absolute",
    bottom: -15,
    flexDirection: "row",
    alignSelf: "center",
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 0, 0, 0.5)",
    marginHorizontal: 4,
  },

  activeDot: {
    backgroundColor: "#640000",
    width: 16,
  },

  mainImage: { width: "100%", height: "100%", resizeMode: "cover" },

  statusBadge: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "#EF5350",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: { color: "white", fontWeight: "800", fontSize: 12 },

  content: { padding: 20 },

  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  vName: { fontSize: 24, fontWeight: "800", color: "#1E293B" },

  vPlate: { color: "#64748B", marginTop: 4 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 16,
    marginBottom: 25,
  },
  is_verified:{
    position:'absolute',
    top:25,
    right:-5,
    fontSize:10,


  },

  statItem: { alignItems: "center", flex: 1 },

  statLabel: { fontSize: 10, color: "#94A3B8", marginTop: 5 },

  statVal: { fontSize: 13, fontWeight: "700", marginTop: 2 },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#EF5350",
    marginBottom: 15,
  },

  infoBox: {
    backgroundColor: "#F8FAFC",
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
  },

  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  infoLabel: { fontSize: 13, color: "#64748B" },

  infoValue: { fontSize: 13, fontWeight: "700" },

  priceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  priceCard: {
    width: "48%",
    backgroundColor: "#FEE2E250",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    marginBottom: 10,
  },

  pLabel: { fontSize: 12, color: "#64748B" },

  pAmount: { fontSize: 18, fontWeight: "800", marginTop: 4 },

  featureList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 25,
  },

  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },

  featureText: { marginLeft: 6, fontSize: 13 },

  partnerCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 15,
    borderRadius: 16,
    marginBottom: 30,
  },

  bizName: { fontSize: 16, fontWeight: "700" },

  phone: { color: "#64748B" },

  callBtn: {
    backgroundColor: "#EF5350",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    flexDirection: "row",
    height: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EF4444",
    color: "red",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },

  deleteBtn: {
    height: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgb(255, 214, 214)",
    borderColor: "#e47874",
    borderWidth: 2,
    color: "red",
    padding: 15,
    borderRadius: 12,
    marginBottom: 40,
    width: "48%",
  },
  updatePhotoBtn: {
    height: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#caebff",
    color: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    gap: 5,
    borderColor: "#74a8e4",
    borderWidth: 2,
    width: "48%",
  },
  updatePhotoBtnText: {
    color: "#0549a1",
    fontWeight: "700",
  },
  editText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
    backgroundColor: "#EF5350",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  deleteText: {
    color: "#e70303",
    fontWeight: "700",
    marginLeft: 8,
  },
});
