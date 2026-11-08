import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useAuth } from "context/AuthContext"; // Path to your context
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen({ navigation }) {
  const { user, logout } = useAuth();
  console.log("settings:", user);

  const MenuItem = ({ icon, title, subtitle, color, onPress, isMaterial }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.iconBg, { backgroundColor: color + "15" }]}>
        {isMaterial ? (
          <MaterialIcons name={icon} size={22} color={color} />
        ) : (
          <Ionicons name={icon} size={22} color={color} />
        )}
      </View>
      <View style={styles.menuTextContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <SafeAreaView style={styles.scrollBody}>
        {/* <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#EF5350" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Settings</Text>
        <View style={{ width: 24 }} />
      </View> */}

        {/* PROFILE CARD */}
        <View style={styles.profileSection}>
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: user?.profilePhotoUrl || "https://via.placeholder.com/150",
              }}
              style={styles.profileImage}
            />
            <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.userName}>{user?.fullName || "user_name"}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>RIDEFLOW PARTNER</Text>
          </View>
          <Text style={styles.userId}>ID: RGPTR{user?.id}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("Profile")}
            style={styles.editProfileBtn}
          >
            <Text style={{ color: "#EF5350", fontWeight: "600" }}>
              View Profile
            </Text>
            <Ionicons
              name="arrow-forward-circle-sharp"
              size={16}
              color="#EF5350"
            />
          </TouchableOpacity>
        </View>

        {/* MANAGEMENT SECTION */}
        <Text style={styles.sectionLabel}>MANAGEMENT</Text>
        <MenuItem icon="heart" title="Subscription Plan" color="#EF5350" />
        {/* <MenuItem
          icon="account-balance"
          title="Bank/Payout Details"
          color="#EF5350"
          isMaterial
        /> */}
        {/* <MenuItem
          icon="language"
          title="Language Preference"
          subtitle="English (US)"
          color="#EF5350"
        /> */}

        {/* SUPPORT SECTION */}
        <Text style={styles.sectionLabel}>SUPPORT & HELP</Text>
        <MenuItem
          icon="help-circle"
          title="Help & Support"
          color="#EF5350"
          onPress={() => navigation.navigate("HelpSupport")}
        />
        <MenuItem
          icon="assignment"
          title="FAQs"
          color="#EF5350"
          isMaterial
          onPress={() => navigation.navigate("Faqs")}
        />
        <MenuItem
          icon="warning"
          title="Report an Issue"
          color="#EF5350"
          isMaterial
          onPress={() => navigation.navigate("CreateTicket")}
        />

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <MaterialCommunityIcons name="logout" size={22} color="#EF5350" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>RIDEFLOW PARTNER V2.4.8 (STABLE)</Text>
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#FFF",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  scrollBody: { padding: 20 },
  profileSection: { alignItems: "center", marginBottom: 30 },
  imageContainer: { position: "relative", marginBottom: 15 },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  onlineBadge: {
    position: "absolute",
    right: 5,
    bottom: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#22C55E",
    borderWidth: 4,
    borderColor: "#FFF",
  },
  userName: { fontSize: 24, fontWeight: "800", color: "#1E293B" },
  roleBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginVertical: 8,
  },
  roleText: { color: "#EF5350", fontSize: 12, fontWeight: "700" },
  userId: { color: "#94A3B8", fontSize: 14 },
  editProfileBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    height: 30,
    paddingHorizontal: 12,
    backgroundColor: "#FEE2E250",
    borderRadius: 20,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 15,
    marginTop: 10,
    letterSpacing: 1,
  },
  menuItem: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
  },
  iconBg: {
    width: 45,
    height: 45,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContent: { flex: 1, marginLeft: 15 },
  menuTitle: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  menuSubtitle: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  logoutBtn: {
    flexDirection: "row",
    backgroundColor: "#FEE2E250",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    padding: 18,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  logoutText: {
    color: "#EF5350",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },
  versionText: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 30,
    marginBottom: 20,
  },
});
