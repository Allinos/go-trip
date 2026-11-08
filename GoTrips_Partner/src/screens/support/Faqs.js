import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatIcons,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getFAQs, searchFAQsApi } from "api/supportApi"; // Ensure these are exported
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = [
  { id: "general", label: "General", icon: "apps-outline" },
  { id: "passenger", label: "Passenger", icon: "person-outline" },
  { id: "payment", label: "Payments", icon: "card-outline" },
  { id: "partner", label: "Partner", icon: "car-outline" },
];

export default function FAQScreen() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("general");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getFAQs(activeCategory);
      if (res.data.success) {
        setFaqs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 3) {
      if (query.length === 0) fetchData();
      return;
    }
    try {
      const res = await searchFAQsApi(query);
      if (res.data.success) {
        setFaqs(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const AccordionItem = ({ item }) => {
    const isOpen = expandedId === item.id;
    return (
      <View style={styles.faqCard}>
        <TouchableOpacity
          style={styles.questionRow}
          onPress={() => setExpandedId(isOpen ? null : item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.questionText}>{item.question}</Text>
          <Ionicons
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748B"
          />
        </TouchableOpacity>
        {isOpen && (
          <View style={styles.answerContainer}>
            <Text style={styles.answerText}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        {/* Search Header */}
        <View style={styles.header}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryBtn,
                  activeCategory === cat.id && styles.categoryBtnActive,
                ]}
                onPress={() => {
                  setActiveCategory(cat.id);
                  setSearchQuery("");
                }}
              >
                <Ionicons
                  name={cat.icon}
                  size={18}
                  color={activeCategory === cat.id ? "#FFF" : "#64748B"}
                />
                <Text
                  style={[
                    styles.categoryText,
                    activeCategory === cat.id && { color: "#FFF" },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ List */}
        {loading ? (
          <ActivityIndicator color="#EF5350" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={faqs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <AccordionItem item={item} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="help-buoy-outline" size={60} color="#E2E8F0" />
                <Text style={styles.emptyText}>
                  No matching questions found.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: { backgroundColor: "#FFF", padding: 20, paddingBottom: 10 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: "#1E293B" },
  categoryContainer: { backgroundColor: "#FFF", paddingBottom: 15 },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F8F9FA",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryBtnActive: { backgroundColor: "#EF5350", borderColor: "#EF5350" },
  categoryText: { marginLeft: 8, fontWeight: "600", color: "#64748B" },
  listContent: { padding: 20 },
  faqCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  questionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 10,
  },
  answerContainer: {
    padding: 18,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  answerText: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  emptyContainer: { alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94A3B8", marginTop: 10, fontSize: 15 },
});
