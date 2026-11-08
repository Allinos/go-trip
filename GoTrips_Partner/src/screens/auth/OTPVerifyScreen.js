import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";

import OTPInput from "components/inputs/OTPInput.js";
import Button from "components/buttons/Button.js";
import { verifyOTP } from "api/authApi.js";

export default function VerifyOTPScreen({ route }) {
  const { phone } = route.params;

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(45);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    const code = otp.join("");

    if (code.length !== 4) {
      alert("Enter OTP");
      return;
    }

    const res = await verifyOTP(phone, code);

    if (res.success) {
      alert("Login Success");
    } else {
      alert(res.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your number</Text>

      <Text style={styles.subtitle}>
        We've sent a 4-digit code to {phone}
      </Text>

      <OTPInput otp={otp} setOtp={setOtp} />

      <Button title="Verify & Proceed" onPress={handleVerify} />

      <Text style={styles.resend}>
        {timer > 0 ? `Resend in 00:${timer}` : "Resend OTP"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
  },

  subtitle: {
    color: "#6B7280",
    marginBottom: 30,
  },

  resend: {
    textAlign: "center",
    marginTop: 20,
    color: "#EF5350",
  },
});