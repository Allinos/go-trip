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
      toast('Photo updated', 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      const r = await meApi.update({ fullName: f.fullName.trim(), email: f.email.trim() || null, gender: f.gender || null, dateOfBirth: toIsoDate(f.dateOfBirth) });
      setUser(r.data);
      toast('Profile saved', 'success');
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
    <Screen title="Edit profile" footer={<Button title="Save" onPress={save} loading={busy} disabled={f.fullName.trim().length < 2} />}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <Pressable onPress={photo} accessibilityLabel="Change photo">
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={32} color={colors.primary} />
            </View>
          )}
        </Pressable>
        <Button small variant="ghost" title="Change photo" onPress={photo} />
      </View>
      <Input label="Full name" required value={f.fullName} onChangeText={set('fullName')} />
      <Input label="Email" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Chips label="Gender" options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} value={f.gender} onChange={set('gender')} />
      <DateField label="Date of birth" value={f.dateOfBirth} onChange={set('dateOfBirth')} maximumDate={maxDob} />
    </Screen>
  );
}
