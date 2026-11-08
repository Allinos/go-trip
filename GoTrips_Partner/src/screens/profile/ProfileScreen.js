import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { partnerProfileAPI } from "api/partnerProfileApi";
import { useAuth } from "context/AuthContext";

const COLORS = {
  primary: "#EF4444", // Vibrant Red
  secondary: "#1F2937",
  background: "#F3F4F6", // Light Gray background
  card: "#FFFFFF",
  text: {
    title: "#111827",
    body: "#4B5563",
    light: "#9CA3AF",
  },
  success: "#10B981",
  accent: "#FEF2F2", // Very light red for backgrounds
};

export default function ProfileScreen() {
  const { user, partner } = useAuth();
  const navigation = useNavigation();
  // const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await partnerProfileAPI.getProfile(partner.id);
      const partnerData = response.data.data;
      // setPartner(partnerData);
      console.log("Partner Data:", partnerData);
      setIsOnline(partnerData?.is_online || false);
    } catch (error) {
      Alert.alert("Error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleToggleOnline = async () => {
    try {
      const newStatus = !isOnline;
      await partnerProfileAPI.toggleOnlineStatus(newStatus);
      setIsOnline(newStatus);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const formatDecimal = (decimalObj) => {
    if (!decimalObj || !decimalObj.d) return 0;
    return decimalObj.d[0];
  };

  if (loading || !partner) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: COLORS.primary, fontWeight: "600" }}>
          Loading Profile...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Modern Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>My Account</Text>
            <Text style={styles.subHeaderText}>
              Manage your professional presence
            </Text>
          </View>
          {/* <TouchableOpacity
            onPress={() => navigation.navigate("EditProfile")}
            style={styles.headerIconButton}
          >
            <MaterialIcons name="edit" size={24} color={COLORS.secondary} />
          </TouchableOpacity> */}
        </View>

        {/* Hero Profile Card */}
        <View style={styles.heroCard}>
          <View style={styles.profileRow}>
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: partner.user?.profile_photo_url }}
                style={styles.avatar}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleOnline}
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: isOnline
                      ? COLORS.success
                      : COLORS.text.light,
                  },
                ]}
              />
            </View>
            <View style={styles.nameDetails}>
              <Text style={styles.userName}>
                {partner.user?.full_name || "Partner Name"}
              </Text>
              <Text style={styles.userRole}>
                {partner.partner_type === "taxi_driver"
                  ? "Taxi Partner"
                  : "Partner"}
              </Text>
              <View style={styles.verifyBadge}>
                <MaterialIcons
                  name="verified"
                  size={14}
                  color={COLORS.success}
                />
                <Text style={styles.verifyText}>Verified Account</Text>
              </View>
            </View>
          </View>

          {/* Quick Stats Integrated into Card */}
          <View style={styles.quickStatsRow}>
            <View style={styles.qStat}>
              <Text style={styles.qStatValue}>
                {formatDecimal(partner.rating_average).toFixed(1)}
              </Text>
              <Text style={styles.qStatLabel}>Rating</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <Text style={styles.qStatValue}>
                {partner.total_rides_completed || 0}
              </Text>
              <Text style={styles.qStatLabel}>Rides</Text>
            </View>
            <View style={styles.qStatDivider} />
            <View style={styles.qStat}>
              <TouchableOpacity
                onPress={handleToggleOnline}
                style={[
                  styles.statusBtn,
                  isOnline ? styles.statusBtnOnline : styles.statusBtnOffline,
                ]}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    { color: isOnline ? COLORS.success : COLORS.text.body },
                  ]}
                >
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Business Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Business Information</Text>
          <View style={styles.infoCard}>
            <InfoItem
              icon="storefront"
              label="Business"
              value={partner.business_name || "Not Set"}
            />
            <InfoItem icon="email" label="Email" value={partner.user?.email} />
            <InfoItem
              icon="phone"
              label="Phone"
              value={partner.user?.phone_number}
            />
            <InfoItem
              icon="translate"
              label="Language"
              value="English (EN)"
              last
            />
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account Settings</Text>
          <View style={styles.actionGrid}>
            <ActionCard
              icon="directions-car"
              label="Vehicles"
              onPress={() => navigation.navigate("Vehicles")}
            />
            {/* <ActionCard
              icon="account-balance"
              label="Payments"
              onPress={() => navigation.navigate("BankDetails")}
            /> */}
            <ActionCard
              icon="description"
              label="Documents"
              onPress={() => navigation.navigate("Documents")}
            />
            {/* <ActionCard
              icon="star-outline"
              label="Reviews"
              onPress={() => navigation.navigate("Reviews")}
            /> */}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn}>
          <MaterialCommunityIcons
            name="logout"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* <Text style={styles.versionText}>Version 1.0.24</Text> */}
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components for cleaner code
const InfoItem = ({ icon, label, value, last }) => (
  <View style={[styles.infoItem, !last && styles.infoBorder]}>
    <View style={styles.infoIconBox}>
      <MaterialIcons name={icon} size={20} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoItemLabel}>{label}</Text>
      <Text style={styles.infoItemValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  </View>
);

const ActionCard = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionCard} onPress={onPress}>
    <View style={styles.actionIconCircle}>
      <MaterialIcons name={icon} size={24} color={COLORS.secondary} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text.title,
    letterSpacing: -0.5,
  },
  subHeaderText: {
    fontSize: 14,
    color: COLORS.text.light,
    marginTop: 2,
  },
  headerIconButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageWrapper: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 4,
    borderColor: COLORS.card,
  },
  nameDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.text.title,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.text.light,
    fontWeight: "500",
    marginVertical: 2,
  },
  verifyBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  verifyText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: "600",
    marginLeft: 4,
  },
  quickStatsRow: {
    flexDirection: "row",
    marginTop: 25,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    alignItems: "center",
  },
  qStat: {
    flex: 1,
    alignItems: "center",
  },
  qStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.secondary,
  },
  qStatLabel: {
    fontSize: 12,
    color: COLORS.text.light,
    marginTop: 2,
  },
  qStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusBtnOnline: {
    backgroundColor: "#ECFDF5",
  },
  statusBtnOffline: {
    backgroundColor: "#F3F4F6",
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text.title,
    marginBottom: 12,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoItemLabel: {
    fontSize: 12,
    color: COLORS.text.light,
  },
  infoItemValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.secondary,
    marginTop: 1,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    backgroundColor: COLORS.card,
    width: "48%",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    elevation: 2,
  },
  actionIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondary,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
  },
  logoutText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    color: COLORS.text.light,
    fontSize: 12,
    marginVertical: 30,
  },
});
