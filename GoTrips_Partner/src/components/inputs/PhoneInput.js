import React from "react";
import { View, TextInput, StyleSheet } from "react-native";

export default function PhoneInput({ value, onChange }) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="000 000 0000"
        keyboardType="phone-pad"
        value={value}
        onChangeText={onChange}
        style={styles.input}
        maxLength={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 20,
  },
  input: {
    height: 55,
    fontSize: 16,
  },
});