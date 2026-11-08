import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { verifyOTP, error, clearError } = useAuthStore();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);

  useEffect(() => {
    // Start countdown timer
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (value, index) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 1) {
      const next = digits.slice(0, 6).split('');
      const padded = [...next, ...Array(6 - next.length).fill('')].slice(0, 6);
      setOtp(padded);
      const focusIdx = Math.min(next.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digits;
    setOtp(newOtp);

    if (digits && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      clearError();
      
      await verifyOTP(params.phoneNumber, otpCode);
      const u = useAuthStore.getState().user;
      const hasProfile = !!(u?.fullName || u?.name);

      if (!hasProfile) {
        router.replace({
          pathname: '/(auth)/register',
          params: { phoneNumber: params.phoneNumber || '', otpCode },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (err) {
      Alert.alert('Error', error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    try {
      setCanResend(false);
      setResendTimer(60);
      
      const { sendOTP } = useAuthStore.getState();
      await sendOTP(params.phoneNumber);
      
      Alert.alert('Success', 'OTP sent successfully');
      
      // Restart timer
      const interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      Alert.alert('Error', 'Failed to resend OTP');
      setCanResend(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={COLORS.text.primary} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <MaterialIcons name="phone-android" size={80} color={COLORS.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.phoneNumber}>{params.phoneNumber}</Text>
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled
              ]}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Resend OTP */}
        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timerText}>
              Resend OTP in {resendTimer}s
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <Button
          mode="contained"
          onPress={handleVerify}
          loading={loading}
          disabled={loading || otp.join('').length !== 6}
          style={styles.button}
          buttonColor={COLORS.primary}
          labelStyle={styles.buttonLabel}
        >
          Verify OTP
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  phoneNumber: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  otpInput: {
    width: 50,
    height: 56,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  resendText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.primary,
  },
  timerText: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.tertiary,
  },
  button: {
    height: 56,
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonLabel: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.white,
  },
});
