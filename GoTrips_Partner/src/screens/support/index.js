import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFAQs, getMyTickets } from "api/supportApi";

export default function HelpSupportScreen({ navigation }) {
  const [faqs, setFaqs] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [faqRes, ticketRes] = await Promise.all([
        getFAQs("passenger"),
        getMyTickets(1),
      ]);
      setFaqs(faqRes.data.data.slice(0, 3)); // Show top 3 FAQs
      setTickets(ticketRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const SupportCard = ({ title, icon, color, onPress }) => (
    <TouchableOpacity style={styles.supportCard} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: color + "15" }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.cardLabel}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Top Header Section */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How can we help you?</Text>
          <View style={styles.cardRow}>
            <SupportCard
              title="Ride Issue"
              icon="car-outline"
              color="#EF5350"
              onPress={() =>
                navigation.navigate("CreateTicket", { type: "ride_issue" })
              }
            />
            <SupportCard
              title="Payment"
              icon="card-outline"
              color="#42A5F5"
              onPress={() =>
                navigation.navigate("CreateTicket", { type: "payment_issue" })
              }
            />
            <SupportCard
              title="Account"
              icon="person-outline"
              color="#66BB6A"
              onPress={() =>
                navigation.navigate("CreateTicket", { type: "account" })
              }
            />
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            <TouchableOpacity onPress={() => navigation.navigate("FAQList")}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {faqs.map((faq, index) => (
            <TouchableOpacity key={index} style={styles.faqRow}>
              <Text style={styles.faqText}>{faq.question}</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* My Tickets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Support Tickets</Text>
          {loading ? (
            <ActivityIndicator color="#EF5350" style={{ marginTop: 20 }} />
          ) : tickets.length > 0 ? (
            tickets.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.ticketCard}
                onPress={() =>
                  navigation.navigate("TicketDetail", { id: item.id })
                }
              >
                <View style={styles.ticketInfo}>
                  <Text style={styles.ticketSubject}>{item.subject}</Text>
                  <Text style={styles.ticketDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === "open" ? "#F59E0B" : "#10B981",
                    },
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No active tickets found.</Text>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("CreateTicket")}
      >
        <Ionicons name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: "#FFF",
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 20,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  supportCard: {
    width: "30%",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    padding: 15,
    borderRadius: 15,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: "#475569" },
  section: { padding: 20, marginTop: 10 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  seeAll: { color: "#EF5350", fontWeight: "600" },
  faqRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 10,
  },
  ticketCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ticketSubject: { fontWeight: "600", color: "#1E293B" },
  ticketDate: { fontSize: 12, color: "#94A3B8", marginTop: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
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
  },
  // Create Ticket Styles
  createContainer: { flex: 1, backgroundColor: "#FFF", padding: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#F8F9FA",
  },
  submitBtn: {
    backgroundColor: "#EF5350",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  submitText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});
