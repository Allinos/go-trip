import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function StartScreen({ navigation }) {
  return (
    <View style={styles.container}>
      
      {/* ICON */}
      <View style={styles.iconCircle}>
        <Ionicons name="car" size={40} color="#EF5350" />
      </View>

      {/* APP NAME */}
      <Text style={styles.title}>RideFlow Partner</Text>

      <Text style={styles.subtitle}>
        Drive. Earn. Grow.
      </Text>

      {/* LOGIN BUTTON */}
      <TouchableOpacity
        style={styles.loginBtn}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.loginText}>Login</Text>
      </TouchableOpacity>

      {/* SIGNUP BUTTON */}
      <TouchableOpacity
        style={styles.signupBtn}
        onPress={() => navigation.navigate("Register")}
      >
        <Text style={styles.signupText}>Create Account</Text>
      </TouchableOpacity>

      {/* FOOTER */}
      <Text style={styles.footer}>
        Join thousands of drivers earning with RideFlow
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#F8F9FA",
  },

  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
  },

  subtitle: {
    color: "#64748B",
    marginBottom: 40,
    fontSize: 16,
  },

  loginBtn: {
    backgroundColor: "#EF5350",
    width: "100%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 15,
  },

  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  signupBtn: {
    borderWidth: 2,
    borderColor: "#EF5350",
    width: "100%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },

  signupText: {
    color: "#EF5350",
    fontSize: 16,
    fontWeight: "600",
  },

  footer: {
    position: "absolute",
    bottom: 50,
    color: "#94A3B8",
  },
});