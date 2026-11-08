import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, Animated, StyleSheet, ActivityIndicator } from "react-native";

export default function OnlineSwitch({ isOnline, setIsOnline, loading }) {
  const anim = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: isOnline ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isOnline]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 80], 
  });

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#f3c7b6", "#10ad49"],
  });

  return (
    <View style={styles.wrapper}>
      <Pressable 
        // 1. Pass the toggled value to the handler
        // 2. Disable press if loading is true
        onPress={() => !loading && setIsOnline(!isOnline)} 
        style={({ pressed }) => [
          { opacity: loading || pressed ? 0.7 : 1 }
        ]}
      >
        <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.labels}>
            <Text style={[styles.text, !isOnline && styles.active]}>
              OFFLINE
            </Text>
            <Text style={[styles.text, isOnline && styles.active]}>
              ONLINE
            </Text>
          </View>

          <Animated.View
            style={[
              styles.knob,
              { transform: [{ translateX }] },
            ]}
          >
            {/* Show a spinner inside the knob if loading */}
            {loading ? (
              <ActivityIndicator size="small" color={isOnline ? "#10ad49" : "#EF5350"} />
            ) : (
              <Text style={styles.knobText}>
                {isOnline ? "ON" : "OFF"}
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", marginVertical: 10 },
  container: {
    width: 150,
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 2,
    position: "relative",
  },
  labels: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.5)",
  },
  active: {
    color: "#FFF",
  },
  knob: {
    width: 66,
    height: 38,
    backgroundColor: "#FFF",
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  knobText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1E293B",
  },
});