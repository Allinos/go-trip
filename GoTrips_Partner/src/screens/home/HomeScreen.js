import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  MaterialIcons,
} from "@expo/vector-icons";
import OnlineSwitch from "components/buttons/Switch";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "context/AuthContext";
import { useToast } from "context/ToastContext";
import { partnerProfileAPI } from "api/partnerProfileApi";

export default function DashboardScreen({ navigation }) {
  const [isOnline, setIsOnline] = useState(false);
  const {user, partner } = useAuth();
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast(); // Hook into our global toast
  const [stats, setStats] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await partnerProfileAPI.getStats(partner.id);
      if (res.data.success) {
        // Mapping API response to your state
        setStats(res.data.data);
        // Based on your API JSON, it's data.profile.isOnline
        setIsOnline(res.data.data.profile?.isOnline || false);
      }
    } catch (err) {
      console.log("Error fetching status:", err);
    } finally {
      setLoading(false);
      setRefreshing(false); // Stop the spinner
    }
  };

  // Use it in useEffect
  useEffect(() => {
    fetchStatus();
  }, []);

  // Define the refresh handler
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchStatus();
  }, []);
  const handleStatusChange = async (newValue) => {
    setLoading(true);
    try {
      const res = await partnerProfileAPI.toggleOnlineStatus(newValue, partner.id);
      if (res.data.success) {
        setIsOnline(newValue);
        showToast(newValue ? "Online" : "Offline", "success");
      }
    } catch (err) {
      showToast("Error updating status", "error");
      console.log(err);
      console.log(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!user) return 0;
    const fields = [
      "fullName",
      "email",
      "dateOfBirth",
      "gender",
      "profilePhotoUrl",
    ];
    const completed = fields.filter(
      (field) => user[field] && user[field] !== "",
    ).length;
    return (completed / fields.length) * 100;
  };

  const progress = calculateProgress();

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Profile")}>
          <View style={styles.avatarCircle}>
            <FontAwesome5 name="user-tie" size={20} color="#334155" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RideFlow Partner</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Notifications")}
          style={{ position: "relative" }}
        >
          <Ionicons name="notifications" size={24} color="#334155" />
          {/* Show badge only if there's something to notify (optional logic) */}
          <View style={styles.notifBadge} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#22C55E"]} // Android spinner color
            tintColor="#22C55E" // iOS spinner color
          />
        }
      >
        {/* Profile Progress / Verification Status Card */}
        <View style={styles.profile_container}>
          <Text style={styles.welcome}>
            Welcome, {user?.fullName || "Partner"}
          </Text>

          {/* Using profile data from API */}
          {stats?.profile?.verificationStatus !== "approved" && (
            <TouchableOpacity
              style={[styles.progressCard, { backgroundColor: "#FEF3C7" }]} // Light amber for warning
              onPress={() => navigation.navigate("ProfileUpdate")}
            >
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: "#92400E" }]}>
                  Verification Pending
                </Text>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color="#92400E"
                />
              </View>
              <Text style={[styles.tapText, { color: "#B45309" }]}>
                Your account is currently {stats?.profile?.verificationStatus}.
                Tap to check details.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CURRENT STATUS CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitleCenter}>Current Status</Text>
          <Text
            style={[
              styles.statusText,
              { color: stats?.profile?.isOnline ? "#22C55E" : "#EF4444" },
            ]}
          >
            {stats?.profile?.isOnline ? "Online" : "Offline"}
          </Text>

          <OnlineSwitch
            isOnline={stats?.profile?.isOnline}
            setIsOnline={handleStatusChange}
            loading={loading}
          />

          <Text style={styles.helperText}>
            {stats?.profile?.isOnline
              ? "You are visible to riders"
              : "Toggle to start receiving ride requests"}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Stats</Text>

        {/* EARNINGS CARD - Dynamically Updated */}
        {/* EARNINGS CARD */}
        {/* <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.summaryLabel}>Total Earnings</Text>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={22}
              color="#22C55E"
            />
          </View>
          <View style={styles.rowAlign}>
            <Text style={styles.earningsAmount}>
              ₹{stats?.earnings?.total || 0}
            </Text>
            <Text style={[styles.earningsPercentage, { color: "#F59E0B" }]}>
              Pending: ₹{stats?.earnings?.pending || 0}
            </Text>
          </View>
        </View> */}

        {/* PRIMARY STATS ROW (Active & Completed) */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statBox]}>
            <View style={styles.rowBetween}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <View
                style={[
                  styles.activeDot,
                  {
                    backgroundColor:
                      stats?.rides?.active > 0 ? "#22C55E" : "#94A3B8",
                  },
                ]}
              />
            </View>
            <Text style={styles.statNumber}>{stats?.rides?.active || 0}</Text>
            <Text style={styles.statSubText}>Ongoing trips</Text>
          </View>

          <View style={[styles.card, styles.statBox]}>
            <View style={styles.rowBetween}>
              <Text style={styles.statLabel}>COMPLETED</Text>
              <MaterialCommunityIcons
                name="check-circle-outline"
                size={18}
                color="#22C55E"
              />
            </View>
            <Text style={styles.statNumber}>
              {stats?.rides?.completed || 0}
            </Text>
            <Text style={styles.statSubText}>Total successful</Text>
          </View>
        </View>

        {/* SECONDARY STATS ROW (Cancelled & Vehicles) */}
        <View style={styles.statsRow}>
          {/* Cancelled Rides */}
          <View style={[styles.card, styles.statBox]}>
            <View style={styles.rowBetween}>
              <Text style={styles.statLabel}>CANCELLED</Text>
              <MaterialCommunityIcons
                name="close-circle-outline"
                size={18}
                color="#EF4444"
              />
            </View>
            <Text style={styles.statNumber}>
              {stats?.rides?.cancelled || 0}
            </Text>
            <Text style={styles.statSubText}>Trips dropped</Text>
          </View>

          {/* Vehicle Status */}
          <View style={[styles.card, styles.statBox]}>
            <View style={styles.rowBetween}>
              <Text style={styles.statLabel}>VEHICLES</Text>
              <FontAwesome5 name="car" size={16} color="#334155" />
            </View>
            <Text style={styles.statNumber}>{stats?.vehicles?.total || 0}</Text>
            <Text style={styles.statSubText}>
              {stats?.vehicles?.active || 0} Active /{" "}
              {stats?.vehicles?.inactive || 0} Inactive
            </Text>
          </View>
        </View>

        {/* PARTNER INFO FOOTER (Optional but helpful) */}
        <View
          style={[styles.card, { marginTop: 10, backgroundColor: "#F8FAFC" }]}
        >
          <View style={styles.rowBetween}>
            <View>
              <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "bold" }}
              >
                PARTNER TYPE
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#334155",
                  textTransform: "capitalize",
                }}
              >
                {stats?.profile?.partnerType?.replace("_", " ")}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{ fontSize: 12, color: "#64748B", fontWeight: "bold" }}
              >
                VERIFICATION
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color:
                    stats?.profile?.verificationStatus === "approved"
                      ? "#22C55E"
                      : "#F59E0B",
                }}
              >
                {stats?.profile?.verificationStatus?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick Actions</Text>

        {/* QUICK ACTIONS */}
        <TouchableOpacity
          style={styles.primaryActionBtn}
          onPress={() => navigation.navigate("CreateRideScreen")}
        >
          <View style={styles.rowAlign}>
            <Ionicons name="add-circle" size={24} color="#FFF" />
            <Text style={styles.primaryActionText}>Create New Ride</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={() => navigation.navigate("Bookings")}
        >
          <View style={styles.rowAlign}>
            <MaterialIcons
              name="format-list-bulleted"
              size={24}
              color="#EF5350"
            />
            <Text style={styles.secondaryActionText}>View All Bookings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {/* RECENT ACTIVITY */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionLabel}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {/* ACTIVITY ITEM 1 */}
        <View style={styles.activityItem}>
          <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>Completed trip #7284</Text>
            <Text style={styles.activitySub}>
              Finished 12 mins ago • $24.40
            </Text>
          </View>
        </View>

        {/* ACTIVITY ITEM 2 */}
        <View style={styles.activityItem}>
          <View style={[styles.iconBox, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="time" size={22} color="#3B82F6" />
          </View>
          <View style={styles.activityInfo}>
            <Text style={styles.activityTitle}>New Booking: 6:00 PM</Text>
            <Text style={styles.activitySub}>
              Airport Terminal 2 • 3.2 miles
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profile_container: {
    flex: 1,
    padding: 0,
    backgroundColor: "#F8F9FA",
    marginBottom: 20,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1E293B",
  },
  progressCard: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 15,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  progressTitle: { fontWeight: "600", color: "#475569" },
  progressPercent: { fontWeight: "bold", color: "#EF5350" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 10,
  },
  progressBarFill: { height: 8, backgroundColor: "#EF5350", borderRadius: 4 },
  tapText: { fontSize: 12, color: "#94A3B8" },

  // GENERAL STYLES
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { padding: 20, paddingBottom: 40 },
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
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  notifBadge: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardTitleCenter: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  statusText: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "800",
    marginVertical: 5,
  },
  statusSwitch: { alignSelf: "center", marginVertical: 8 },
  helperText: { textAlign: "center", color: "#64748B", fontSize: 13 },

  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 15,
    marginTop: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowAlign: { flexDirection: "row", alignItems: "center" },

  summaryLabel: { color: "#64748B", fontSize: 14, fontWeight: "600" },
  earningsAmount: { fontSize: 34, fontWeight: "800", color: "#1E293B" },
  earningsPercentage: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 10,
    marginTop: 8,
  },

  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: { width: "48%" },
  statLabel: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },
  statNumber: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1E293B",
    marginVertical: 5,
  },
  statSubText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },

  primaryActionBtn: {
    backgroundColor: "#EF5350",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryActionText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },
  secondaryActionBtn: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
    marginBottom: 20,
  },
  secondaryActionText: {
    color: "#1E293B",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
  },

  viewAllText: { color: "#EF5350", fontSize: 13, fontWeight: "700" },
  activityItem: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  activityInfo: { marginLeft: 15 },
  activityTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  activitySub: { fontSize: 13, color: "#94A3B8", marginTop: 3 },
});
