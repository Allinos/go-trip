import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import OTPInput from "components/inputs/OTPInput";
import {
  checkPhone,
  sendOTPApi,
  verifyOTPApi,
  resendOTPApi,
} from "api/authApi";
import { useAuth } from "context/AuthContext";
import {partnerProfileAPI} from "api/partnerProfileApi";

export default function AuthScreen({ navigation }) {
  const [phone, setPhone] = useState("");
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(45);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  useEffect(() => {
    if (showOTP) {
      const interval = setInterval(() => {
        setTimer((t) => (t > 0 ? t - 1 : 0));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [showOTP]);

  const sendOTP = async () => {
    if (phone.length < 10) {
      alert("Enter valid mobile number");
      return;
    }

    try {
      setLoading(true);
      // const check = await checkPhone(phone);
      // if (check.data.exists) {
      //   console.log("Existing user login");
      // } else {
      //   console.log("New user signup");
      // }
      await sendOTPApi(phone);
      setShowOTP(true);
      setTimer(90);
    } catch (error) {
      console.error(error);
      alert("Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    const code = otp.join(""); // This turns ["1","2"...] into "123456"

    if (code.length !== 6) {
      alert("Enter valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      // Send the string 'code', not the array 'otp'
      const response = await verifyOTPApi(phone, code);

      if (response.data.success) {
        console.log("login check response:", response.data.data.user);

        if (response.data.data.user.userType == "partner") {
          let partnerData = await partnerProfileAPI.getProfileByUserId(
            response.data.data.user.id,
          );
          await login(...response.data, partnerData.data.data);
        } else {
          await login(response.data);
        }

        // response.data contains { success: true, data: { accessToken, user ... } }
        // NOTE: You don't need navigation.replace("Dashboard") anymore!
        // Once login() updates the state in AuthContext,
        // AppNavigator will automatically swap to TabNavigator.
      } else {
        alert(response.data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error("Login Error:", error.response?.data || error.message);
      alert("Invalid OTP or Server Error");
    } finally {
      setLoading(false);
    }
  };
  const resendOTP = async () => {
    try {
      await resendOTPApi(phone);
      setTimer(90);
      setOtp(["", "", "", "", "", ""]); // Reset OTP input fields024970
    } catch {
      alert("Failed to resend OTP");
    }
  };
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Ionicons
          name="arrow-back"
          size={26}
          color="#EF5350"
          onPress={() => navigato}
        />
        <Text style={styles.headerTitle}>RideFlow Partner</Text>
      </View>

      {/* ICON */}
      <View style={styles.iconCircle}>
        <Ionicons name="car" size={40} color="#EF5350" />
      </View>

      {/* TITLE */}
      <Text style={styles.title}>Drive with flow.</Text>

      <Text style={styles.subtitle}>
        Enter your mobile number to get started as a partner.
      </Text>

      {/* MOBILE INPUT */}
      {!showOTP && (
        <>
          <Text style={styles.label}>Mobile Number</Text>

          <View style={styles.phoneRow}>
            <View style={styles.countryBox}>
              <Text style={{ fontSize: 16 }}>+91 IN</Text>
              <Ionicons name="chevron-down" size={18} />
            </View>

            <TextInput
              style={styles.phoneInput}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={sendOTP}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Get OTP →</Text>
          </TouchableOpacity>
        </>
      )}

      {/* OTP SECTION */}
      {showOTP && (
        <>
          <Text style={styles.verifyTitle}>Verify your number</Text>
          <Text style={styles.verifyText}>
            We've sent a 6-digit code to
            <Text style={{ fontWeight: "600" }}> +91-{phone}</Text>
            <Text
              style={styles.edit}
              onPress={() => {
                setShowOTP(false);
                setOtp(["", "", "", "", "", ""]);
              }}
            >
              {" "}
              Edit
            </Text>
          </Text>

          {/* OTP BOXES */}
          <OTPInput otp={otp} setOtp={setOtp} />

          {/* VERIFY BUTTON */}
          <TouchableOpacity style={styles.button} onPress={verifyOTP}>
            <Text style={styles.buttonText}>Verify & Proceed</Text>
          </TouchableOpacity>

          {/* RESEND */}
          <Text style={styles.resend}>Didn't receive the code?</Text>

          {timer > 0 ? (
            <Text style={styles.resendTimer}>⟳ Resend in 00:{timer}</Text>
          ) : (
            <TouchableOpacity
              onPress={async () => {
                try {
                  await resendOTP(phone);
                  setTimer(45);
                } catch {
                  alert("Failed to resend OTP");
                }
              }}
            >
              <Text style={styles.resendTimer}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* FOOTER */}
      <View style={styles.footer}>
        <Ionicons name="lock-closed" size={16} color="#94A3B8" />
        <Text style={styles.secure}>
          Your connection is encrypted and secure
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 25,
    backgroundColor: "#F8F9FA",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 10,
  },

  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: "#FEE2E2",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
  },

  subtitle: {
    textAlign: "center",
    color: "#64748B",
    marginTop: 10,
    marginBottom: 30,
    fontSize: 16,
  },

  label: {
    fontSize: 15,
    marginBottom: 10,
  },

  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },

  countryBox: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 15,
    height: 55,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  phoneInput: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
  },

  button: {
    backgroundColor: "#EF5350",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 25,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  verifyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginTop: 20,
  },

  verifyText: {
    color: "#64748B",
    marginBottom: 20,
  },

  edit: {
    color: "#EF5350",
    fontWeight: "600",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  otpBox: {
    width: 65,
    height: 65,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    textAlign: "center",
    fontSize: 22,
  },

  resend: {
    textAlign: "center",
    marginTop: 20,
    color: "#64748B",
  },

  resendTimer: {
    textAlign: "center",
    color: "#EF5350",
    fontSize: 16,
    marginTop: 5,
  },

  footer: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },

  secure: {
    marginLeft: 5,
    color: "#94A3B8",
  },
});
