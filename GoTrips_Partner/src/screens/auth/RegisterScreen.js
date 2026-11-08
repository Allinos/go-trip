import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";

import {
  sendOTPApi,
  sendSignUpOTPApi,
  verifyOTPApi,
  checkPhone,
  resendOTPApi,
} from "api/authApi";
import { useAuth } from "context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RegisterScreen({navigation}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const isValidPhone = phone.length === 10;
  const isValidOTP = otp.length >= 4;

  // 📲 Send OTP
  const handleSendOTP = async () => {
    if (!isValidPhone) {
      return Alert.alert("Error", "Enter valid 10-digit phone number");
    }

    setLoading(true);
    try {
      const checkRes = await checkPhone(phone);

      if (checkRes?.data?.exists) {
        return Alert.alert(
          "Error",
          "Phone number already registered. Please login.",
        );
      }
      const res = await sendSignUpOTPApi(phone);

      if (res?.data?.success) {
        setStep(2);
      } else {
        Alert.alert("Error", "Failed to send OTP");
      }
    } catch (err) {
      console.log("DATA:", err?.response?.data);
      console.log("MESSAGE:", err?.response?.data?.message);
      Alert.alert("Error", "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };
  const resndOTP = async () => {
    setLoading(true);
    try {
      const res = await resendOTPApi(phone);
      if (res?.data?.success) {
        Alert.alert("Success", "OTP resent successfully");
      } else {
        Alert.alert("Error", "Failed to resend OTP");
      }
    } catch (err) {
      Alert.alert("Error", "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Verify OTP
  const handleVerifyOTP = async () => {
    let res;
    if (!isValidOTP) {
      return Alert.alert("Error", "Enter valid OTP");
    }

    setLoading(true);
    try {
      res = await verifyOTPApi(phone, otp);
      // res ={date:{"data": {"accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwicGhvbmVOdW1iZXIiOiIrOTE5NDAxMDY5MzM3IiwidXNlclR5cGUiOiJwYXNzZW5nZXIiLCJpYXQiOjE3NzQ5NDI2ODIsImV4cCI6MTc3NjIzODY4Mn0.9sn4Y1rYOM_82anEYswtZqHqAja-DxGhV0WnnY0Sqz8", "expiresIn": "15d", "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyIiwiaWF0IjoxNzc0OTQyNjgyLCJleHAiOjE3Nzc1MzQ2ODJ9.ORbQk309U4He8Bpvp3fRYVmidbXxpHu6Ab3lG_GdOhs", "user": {"email": null, "fullName": null, "id": "2", "isVerified": true, "phoneNumber": "+919401069337", "profilePhotoUrl": null, "userType": "passenger"}}, "message": "Login successful", "success": true, "timestamp": "2026-03-31T07:38:02.516Z"}}
      console.log(res.data);
      
      if (res?.data?.success) {
        console.log("OTP Verified", res.data);
        navigation.replace("ProfileFill",{ authData: res }); // Pass auth data to profile fill screen
        // await login(res.data); // store token + user
      } else {
        Alert.alert("Error", "Invalid OTP");
      }
    } catch (err) {
      console.log("error:", err);
      console.log("MESSAGE:", err?.response?.data?.error.message);
      Alert.alert("Error", err?.response?.data?.error?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === 1 ? "Create Driver Account" : "Verify OTP"}
        </Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? "Enter your mobile number to continue"
            : `OTP sent to +91 ${phone}`}
        </Text>
      </View>

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {step === 1 ? "Mobile Number" : "Enter OTP"}
        </Text>

        {step === 1 ? (
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.codeText}>+91</Text>
            </View>

            <TextInput
              placeholder="Enter mobile number"
              keyboardType="phone-pad"
              style={styles.input}
              value={phone}
              maxLength={10}
              onChangeText={setPhone}
            />
          </View>
        ) : (
          <TextInput
            placeholder="Enter OTP"
            keyboardType="numeric"
            style={styles.otpInput}
            value={otp}
            maxLength={6}
            onChangeText={setOtp}
          />
        )}

        {/* Validation */}
        {step === 1 && phone.length > 0 && !isValidPhone && (
          <Text style={styles.errorText}>
            Please enter a valid 10-digit number
          </Text>
        )}

        {step === 2 && otp.length > 0 && !isValidOTP && (
          <Text style={styles.errorText}>Invalid OTP</Text>
        )}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={[
          styles.button,
          (step === 1 && !isValidPhone) ||
          (step === 2 && !isValidOTP) ||
          loading
            ? styles.disabledButton
            : null,
        ]}
        disabled={loading || (step === 1 ? !isValidPhone : !isValidOTP)}
        onPress={step === 1 ? handleSendOTP : handleVerifyOTP}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>
            {step === 1 ? "Get OTP" : "Verify & Continue"}
          </Text>
        )}
      </TouchableOpacity>

      {/* Resend OTP */}
      {step === 2 && (
        <TouchableOpacity onPress={resndOTP }>
          <Text style={styles.resendText}>Resend OTP</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <Text style={styles.footerText}>
        By continuing, you agree to our{" "}
        <Text style={styles.link}>Terms & Conditions</Text> and{" "}
        <Text style={styles.link}>Privacy Policy</Text>
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
  },

  header: {
    marginTop: 60,
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },

  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
  },

  inputContainer: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#374151",
    fontWeight: "500",
  },

  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    overflow: "hidden",
  },

  countryCode: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: "#E5E7EB",
  },

  codeText: {
    fontWeight: "600",
    color: "#111827",
  },

  input: {
    flex: 1,
    paddingHorizontal: 12,
    height: 55,
    fontSize: 16,
  },

  otpInput: {
    height: 55,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    fontSize: 18,
    letterSpacing: 6,
    textAlign: "center",
  },

  errorText: {
    marginTop: 6,
    color: "#EF4444",
    fontSize: 12,
  },

  button: {
    marginTop: 10,
    backgroundColor: "#EF5350",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },

  disabledButton: {
    backgroundColor: "#FCA5A5",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },

  resendText: {
    marginTop: 15,
    textAlign: "center",
    color: "#EF5350",
    fontWeight: "500",
  },

  footerText: {
    marginTop: 30,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },

  link: {
    color: "#EF5350",
    fontWeight: "500",
  },
});
