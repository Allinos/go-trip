import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Checkbox } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY, VALIDATION_RULES } from '../../constants';

function paramStr(v) {
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isRegisterFlow = paramStr(params.flow) === 'register';
  const { sendOTP, error, clearError } = useAuthStore();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePhone = () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!VALIDATION_RULES.phone.pattern.test(phoneNumber)) {
      Alert.alert('Error', VALIDATION_RULES.phone.message);
      return false;
    }
    if (!agreedToTerms) {
      Alert.alert('Error', 'Please accept the Terms & Conditions');
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhone()) return;

    try {
      setLoading(true);
      clearError();
      
      const formattedPhone = `+91${phoneNumber}`;
      await sendOTP(formattedPhone);
      
      router.push({
        pathname: '/(auth)/verify-otp',
        params: { phoneNumber: formattedPhone }
      });
    } catch (err) {
      Alert.alert('Error', error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <MaterialIcons name="directions-car" size={80} color={COLORS.primary} />
            <Text style={styles.title}>{isRegisterFlow ? 'Create account' : 'RideFlow'}</Text>
            <Text style={styles.subtitle}>
              {isRegisterFlow
                ? 'Enter your mobile number to sign up'
                : 'Your journey begins here'}
            </Text>
          </View>

          {/* Phone Input */}
          <View style={styles.form}>
            <Text style={styles.label}>
              {isRegisterFlow ? 'Mobile number' : 'Enter your mobile number'}
            </Text>
            
            <View style={styles.phoneContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                mode="outlined"
                placeholder="9876543210"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                maxLength={10}
                style={styles.phoneInput}
                outlineColor={COLORS.border}
                activeOutlineColor={COLORS.primary}
              />
            </View>

            {/* Terms Checkbox */}
            <View style={styles.checkboxContainer}>
              <Checkbox
                status={agreedToTerms ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                color={COLORS.primary}
              />
              <Text style={styles.checkboxText}>
                I agree to the{' '}
                <Text style={styles.link}>Terms & Conditions</Text>
                {' '}and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </View>

            {/* Send OTP Button */}
            <Button
              mode="contained"
              onPress={handleSendOTP}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor={COLORS.primary}
              labelStyle={styles.buttonLabel}
            >
              {isRegisterFlow ? 'Continue' : 'Send OTP'}
            </Button>

            {/* Help Text */}
            <Text style={styles.helpText}>
              We'll send you a 6-digit OTP to verify your number
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  title: {
    ...TYPOGRAPHY.h1,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  form: {
    width: '100%',
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    marginBottom: SPACING.sm,
  },
  phoneContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  countryCode: {
    width: 60,
    height: 56,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countryCodeText: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  checkboxText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    flex: 1,
    marginLeft: SPACING.xs,
  },
  link: {
    color: COLORS.primary,
    fontWeight: '600',
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
  helpText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
