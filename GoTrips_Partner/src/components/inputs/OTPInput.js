import React, { useRef } from "react";
import { View, TextInput, StyleSheet } from "react-native";

export default function OTPInput({ otp, setOtp }) {
  const inputs = useRef([]);

  const handleChange = (text, index) => {
    const newOtp = [...otp];

    // User deleted value
    if (text === "") {
      newOtp[index] = "";
      setOtp(newOtp);

      if (index > 0) {
        inputs.current[index - 1].focus();
      }

      return;
    }

    // Normal input
    newOtp[index] = text;
    setOtp(newOtp);

    if (index < otp.length - 1) {
      inputs.current[index + 1].focus();
    }
  };

  return (
    <View style={styles.container}>
      {otp.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputs.current[index] = ref)}
          style={styles.box}
          keyboardType="number-pad"
          maxLength={1}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 20,
  },

  box: {
    width: 55,
    height: 50,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    backgroundColor: "#F8FAFC",
  },
});
