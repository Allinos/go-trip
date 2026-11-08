import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, ProgressSteps, Screen } from '../../components/ui';
import { meApi, partnerApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import LanguageSwitch from '../../components/LanguageSwitch';
import { useAdvance, progressSteps } from './flow';
import { font } from '../../theme';
import { t } from '../../i18n';

export default function NameScreen({ navigation }) {
  const { user, setUser, onboarding, logout } = useAuth();
  const [name, setName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const advance = useAdvance(navigation);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await meApi.update({ fullName: name.trim(), ...(email.trim() ? { email: email.trim() } : {}) });
      setUser(r.data);
      advance((await partnerApi.onboarding()).data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t("Partner registration")} back={false} right={<Button title={t("Log out")} variant="ghost" small onPress={logout} />} footer={<Button title={t("Continue")} onPress={save} loading={busy} disabled={name.trim().length < 2} />}>
      <ProgressSteps steps={progressSteps(onboarding)} current="profile" />
      <LanguageSwitch style={{ marginTop: 8 }} />
      <Text style={[font.h1, { marginTop: 8 }]}>{t("What is your name?")}</Text>
      <Text style={[font.sub, { marginTop: 6, marginBottom: 24 }]}>{t("Use the name on your Aadhaar / driving licence.")}</Text>
      <Input label={t("Full name")} required value={name} onChangeText={setName} placeholder={t("e.g. Bikash Deka")} autoCapitalize="words" autoFocus />
      <Input label={t("Email (optional)")} value={email} onChangeText={setEmail} placeholder={t("you@example.com")} keyboardType="email-address" autoCapitalize="none" hint={t("We send payment receipts here")} error={error} />
    </Screen>
  );
}
