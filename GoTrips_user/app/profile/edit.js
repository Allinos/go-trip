import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, SegmentedButtons } from 'react-native-paper';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { userAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import CustomButton from '../../components/CustomButton';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.fullName || user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [gender, setGender] = useState(user?.gender || 'male');
  const [dob, setDob] = useState(user?.dateOfBirth || user?.dob || '');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Photo access required');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setPhoto(res.assets[0]);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    try {
      setLoading(true);
      await userAPI.updateProfile({
        fullName: name.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        gender,
        dateOfBirth: dob.trim() || undefined,
      });
      await updateUser({
        fullName: name.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
        gender,
        dateOfBirth: dob.trim() || undefined,
      });
      if (photo?.uri) {
        const form = new FormData();
        form.append('photo', {
          uri: photo.uri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        });
        try {
          await userAPI.uploadPhoto(form);
        } catch (e) {
          console.warn(e);
        }
      }
      Alert.alert('Saved', 'Profile updated', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.photoWrap} onPress={pick}>
            {photo?.uri ? (
              <Image source={{ uri: photo.uri }} style={styles.photo} />
            ) : user?.photoUrl || user?.avatar ? (
              <Image source={{ uri: user.photoUrl || user.avatar }} style={styles.photo} />
            ) : (
              <View style={styles.photoPh}>
                <MaterialIcons name="add-a-photo" size={40} color={COLORS.primary} />
                <Text style={styles.photoLbl}>Change photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Name</Text>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={setName}
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <Text style={styles.label}>Gender</Text>
          <SegmentedButtons
            value={gender}
            onValueChange={setGender}
            buttons={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            style={styles.seg}
          />

          <Text style={styles.label}>Date of birth (YYYY-MM-DD)</Text>
          <TextInput
            mode="outlined"
            value={dob}
            onChangeText={setDob}
            placeholder="1990-01-15"
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <CustomButton title="Save" onPress={save} loading={loading} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  photoWrap: { alignSelf: 'center', marginBottom: SPACING.lg },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPh: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  photoLbl: { ...TYPOGRAPHY.small, color: COLORS.primary, marginTop: 4 },
  label: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.background, marginBottom: SPACING.sm },
  seg: { marginBottom: SPACING.lg },
});
