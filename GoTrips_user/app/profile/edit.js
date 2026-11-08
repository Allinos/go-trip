import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, Header, Input, Row } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { errorMessage, userAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { t } from '../../i18n';

export default function EditProfile() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [f, setF] = useState({ fullName: user?.fullName || '', email: user?.email || '', gender: user?.gender || null, city: user?.city || '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const r = await userAPI.update({ fullName: f.fullName.trim(), email: f.email.trim() || null, gender: f.gender, city: f.city.trim() || null });
      setUser(r.data);
      router.back();
    } catch (e) {
      Alert.alert(t("Could not save"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Edit profile")} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <Input label={t("Full name")} value={f.fullName} onChangeText={(fullName) => setF({ ...f, fullName })} />
        <Input label={t("Email")} value={f.email} onChangeText={(email) => setF({ ...f, email })} keyboardType="email-address" autoCapitalize="none" />
        <Input label={t("City")} value={f.city} onChangeText={(city) => setF({ ...f, city })} />
        <Text style={[TYPOGRAPHY.captionBold, { marginBottom: 6 }]}>{t("Gender")}</Text>
        <Row style={{ marginBottom: SPACING.lg }}>
          {['male', 'female', 'other'].map((g) => (
            <Chip key={g} label={g[0].toUpperCase() + g.slice(1)} active={f.gender === g} onPress={() => setF({ ...f, gender: g })} />
          ))}
        </Row>
        <Button title={t("Save")} onPress={save} loading={busy} disabled={f.fullName.trim().length < 2} />
      </ScrollView>
    </View>
  );
}
