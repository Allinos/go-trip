import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, Screen } from '../../components/ui';
import { authApi } from '../../api';
import { errorMessage } from '../../api/client';
import { font } from '../../theme';
import { t } from '../../i18n';

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = /^[6-9]\d{9}$/.test(phone);

  const send = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await authApi.sendOtp(phone);
      navigation.navigate('Otp', { phone, info: r.data });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="" footer={<Button title={t("Send OTP")} onPress={send} loading={busy} disabled={!valid} />}>
      <Text style={font.h1}>{t("Enter your mobile number")}</Text>
      <Text style={[font.sub, { marginTop: 6, marginBottom: 24 }]}>{t("We will send a 6-digit code by SMS to verify it's you.")}</Text>
      <Input
        label={t("Mobile number")}
        prefix="+91"
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(-10))}
        keyboardType="phone-pad"
        maxLength={10}
        placeholder="98765 43210"
        autoFocus
        error={error}
        textContentType="telephoneNumber"
        autoComplete="tel"
        onSubmitEditing={() => valid && send()}
      />
      <Text style={font.small}>{t("By continuing you agree to the GoTrip Partner terms and privacy policy.")}</Text>
    </Screen>
  );
}
