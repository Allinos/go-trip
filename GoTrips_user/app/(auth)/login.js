import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Input, Notice } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { errorMessage, userAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

/**
 * One modal for the whole login: phone → OTP → (first time) name.
 * Closing it returns the user to exactly where they were (e.g. the trip they wanted to book).
 */
export default function LoginScreen() {
  const router = useRouter();
  const { sendOtp, verifyOtp, setUser } = useAuthStore();
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const otpInput = useRef();

  useEffect(() => {
    if (wait <= 0) return undefined;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const requestOtp = () =>
    run(async () => {
      const r = await sendOtp(phone);
      setDevOtp(r.data.devOtp || '');
      setWait(r.data.resendAfter || 30);
      setOtp('');
      setStep('otp');
    });

  const checkOtp = (code = otp) =>
    code.length === 6 &&
    run(async () => {
      try {
        const r = await verifyOtp(phone, code);
        if (r.profileComplete) close();
        else setStep('name');
      } catch (e) {
        setOtp('');
        throw e;
      }
    });

  const saveName = () =>
    run(async () => {
      const r = await userAPI.update({ fullName: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      setUser(r.data);
      close();
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={step === 'otp' ? () => setStep('phone') : close} hitSlop={12} accessibilityLabel={step === 'otp' ? 'Back' : 'Close'}>
            <MaterialIcons name={step === 'otp' ? 'arrow-back' : 'close'} size={26} color={COLORS.text.primary} />
          </Pressable>

          {step === 'phone' && (
            <>
              <View style={{ alignItems: 'center', marginVertical: 28 }}>
                <View style={{ backgroundColor: COLORS.primary, borderRadius: 20, padding: 14 }}>
                  <MaterialCommunityIcons name="car" size={40} color="#fff" />
                </View>
                <Text style={[TYPOGRAPHY.h2, { marginTop: 12 }]}>Welcome to GoTrip</Text>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, textAlign: 'center', marginTop: 4 }]}>Book seats, rent vehicles and hire drivers across Assam</Text>
              </View>
              <Input label="Mobile number" prefix="+91" value={phone} onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(-10))} keyboardType="phone-pad" maxLength={10} placeholder="98765 43210" autoFocus onSubmitEditing={() => /^[6-9]\d{9}$/.test(phone) && requestOtp()} />
              {error ? <Text style={{ color: COLORS.error, marginBottom: 12 }}>{error}</Text> : null}
              <Button title="Get OTP" onPress={requestOtp} loading={busy} disabled={!/^[6-9]\d{9}$/.test(phone)} />
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary, textAlign: 'center', marginTop: 16 }]}>By continuing you agree to GoTrip's terms and privacy policy.</Text>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={[TYPOGRAPHY.h2, { marginTop: 20 }]}>Enter OTP</Text>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 4, marginBottom: 24 }]}>Sent to +91 {phone}</Text>
              {devOtp ? <Notice title="Test mode" text={`Your code is ${devOtp}`} /> : null}
              <Pressable onPress={() => otpInput.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={{ width: 48, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: otp.length === i ? COLORS.primary : COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: '700' }}>{otp[i] || ''}</Text>
                  </View>
                ))}
              </Pressable>
              <TextInput
                ref={otpInput}
                value={otp}
                onChangeText={(t) => {
                  const v = t.replace(/\D/g, '').slice(0, 6);
                  setOtp(v);
                  if (v.length === 6) checkOtp(v);
                }}
                autoFocus
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={6}
                style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
                accessibilityLabel="OTP code"
              />
              {error ? <Text style={{ color: COLORS.error, marginBottom: 12 }}>{error}</Text> : null}
              <Button title="Verify" onPress={() => checkOtp()} loading={busy} disabled={otp.length !== 6} />
              <View style={{ alignItems: 'center', marginTop: 16 }}>{wait > 0 ? <Text style={{ color: COLORS.text.secondary }}>Resend in {wait}s</Text> : <Button small variant="ghost" title="Resend OTP" onPress={requestOtp} />}</View>
            </>
          )}

          {step === 'name' && (
            <>
              <Text style={[TYPOGRAPHY.h2, { marginTop: 20 }]}>What's your name?</Text>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 4, marginBottom: 24 }]}>Drivers see your name when you request a seat.</Text>
              <Input label="Full name" value={name} onChangeText={setName} placeholder="e.g. Ananya Bora" autoCapitalize="words" autoFocus />
              <Input label="Email (optional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              {error ? <Text style={{ color: COLORS.error, marginBottom: 12 }}>{error}</Text> : null}
              <Button title="Continue" onPress={saveName} loading={busy} disabled={name.trim().length < 2} />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
