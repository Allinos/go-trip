import React, { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chips, Input, Screen } from '../../components/ui';
import { DateField, toIsoDate } from '../../components/fields';
import { meApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

export default function EditProfileScreen({ navigation }) {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ fullName: user.fullName || '', email: user.email || '', gender: user.gender, dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null });
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  const photo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (r.canceled) return;
    try {
      setUser((await meApi.photo(r.assets[0].uri)).data);
      toast(t("Photo updated"), 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await meApi.update({ fullName: f.fullName.trim(), email: f.email.trim() || null, gender: f.gender || null, dateOfBirth: toIsoDate(f.dateOfBirth) });
      setUser(r.data);
      toast(t("Profile saved"), 'success');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 18);
  return (
    <Screen title={t("Edit profile")} footer={<Button title={t("Save")} onPress={save} loading={busy} disabled={f.fullName.trim().length < 2} />}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable onPress={photo} accessibilityLabel={t("Change photo")}>
          {user.photoUrl ? (
            <CachedImage uri={user.photoUrl} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={32} color={colors.primary} />
            </View>
          )}
        </Pressable>
        <Button small variant="ghost" title={t("Change photo")} onPress={photo} />
      </View>
      <Input label={t("Full name")} required value={f.fullName} onChangeText={set('fullName')} />
      <Input label={t("Email")} value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Chips label={t("Gender")} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} value={f.gender} onChange={set('gender')} />
      <DateField label={t("Date of birth")} value={f.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={maxDob} />
    </Screen>
  );
}
