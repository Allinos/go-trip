import React from "react";
import { View, StyleSheet } from "react-native";

export default function LoadingBar({ progress, color }) {
  return (
    <View style={styles.container}>
      <View style={[styles.progress, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 6,
    width: "70%",
    backgroundColor: "#D1D5DB",
    borderRadius: 10,
    overflow: "hidden",
  },
  progress: {
    height: "100%",
    borderRadius: 10,
  },
});