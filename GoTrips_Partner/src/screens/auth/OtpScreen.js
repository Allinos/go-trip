import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Notice, Screen } from '../../components/ui';
import { authApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, font, radius } from '../../theme';
import { t } from '../../i18n';

export default function OtpScreen({ route }) {
  const { phone, info } = route.params;
  const { login } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(info?.resendAfter || 30);
  const [devOtp, setDevOtp] = useState(info?.devOtp);
  const input = useRef();

  useEffect(() => {
    if (wait <= 0) return undefined;
    const v = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(v);
  }, [wait]);

  const verify = async (code = otp) => {
    if (code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      await login(phone, code); // AuthContext switches to onboarding / main app
    } catch (e) {
      setError(errorMessage(e));
      setOtp('');
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      const r = await authApi.sendOtp(phone);
      setDevOtp(r.data.devOtp);
      setWait(r.data.resendAfter || 30);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen title="" footer={<Button title={t("Verify & continue")} onPress={() => verify()} loading={busy} disabled={otp.length !== 6} />}>
      <Text style={font.h1}>{t("Enter the code")}</Text>
      <Text style={[font.sub, { marginTop: 6, marginBottom: 24 }]}>{t("Sent by SMS to +91")}{" "}{phone}</Text>
      {devOtp ? <Notice tone="blue" title={t("Test mode")} text={t("Your code is {0}", [devOtp])} /> : null}
      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={{ width: 48, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: otp.length === i ? colors.primary : error ? colors.primaryDark : colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '700' }}>{otp[i] || ''}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        value={otp}
        onChangeText={(txt) => {
          const v = txt.replace(/\D/g, '').slice(0, 6);
          setOtp(v);
          if (v.length === 6) verify(v);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={6}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        accessibilityLabel={t("OTP code")}
      />
      {error ? <Text style={{ color: colors.primaryDark, marginBottom: 12 }}>{error}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
        {wait > 0 ? <Text style={font.sub}>{t("Resend code in")}{" "}{wait}s</Text> : <Button title={t("Resend code")} variant="ghost" small onPress={resend} />}
      </View>
    </Screen>
  );
}
