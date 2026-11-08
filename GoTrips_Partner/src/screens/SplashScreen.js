import React, { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, Image } from "react-native";

import LoadingBar from "../components/LoadingBar";
import { ThemeContext } from "../context/ThemeContext";

export default function SplashScreen() {
  const { theme } = useContext(ThemeContext);
  const { colors } = theme;

  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        return p + 10;
      });
    }, 400);

    return () => clearInterval(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.logoContainer}>
        {/* <Image source={require("../assets/car.png")} style={styles.logo} /> */}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        RideFlow <Text style={{ color: colors.primary }}>Partner</Text>
      </Text>

      <Text style={[styles.tagline, { color: colors.subText }]}>
        DRIVE. EARN. GROW.
      </Text>

      <View style={{ marginTop: 50 }}>
        <LoadingBar progress={progress} color={colors.primary} />
      </View>

      <Text style={[styles.status, { color: colors.subText }]}>
        Initializing secure connection...
      </Text>

      <Text style={[styles.footer, { color: colors.subText }]}>
        POWERED BY RIDEFLOW
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logoContainer: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FEE2E2",
    marginBottom: 20,
  },

  logo: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
  },

  tagline: {
    marginTop: 5,
    letterSpacing: 2,
  },

  status: {
    marginTop: 15,
    fontSize: 13,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    fontSize: 12,
    letterSpacing: 2,
  },
});
