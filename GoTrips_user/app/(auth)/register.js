import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { TextInput, SegmentedButtons } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { userAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import CustomButton from '../../components/CustomButton';

function paramStr(v) {
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { updateUser, user } = useAuthStore();

  const phoneNumber = paramStr(params.phoneNumber) || user?.phoneNumber || user?.phone || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('male');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission', 'Photo library access is required');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.[0]) {
      setPhoto(res.assets[0]);
    }
  };

  const submit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Full name is required');
      return;
    }
    try {
      setLoading(true);
      await userAPI.updateProfile({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        gender,
        phoneNumber: phoneNumber || undefined,
      });
      await updateUser({
        fullName: fullName.trim(),
        name: fullName.trim(),
        email: email.trim() || undefined,
        gender,
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
          console.warn('uploadPhoto', e);
        }
      }

      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Complete registration</Text>
          <Text style={styles.sub}>Tell us a bit about you</Text>

          <TouchableOpacity style={styles.photoWrap} onPress={pickPhoto}>
            {photo?.uri ? (
              <Image source={{ uri: photo.uri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPh}>
                <MaterialIcons name="add-a-photo" size={40} color={COLORS.primary} />
                <Text style={styles.photoLabel}>Profile photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Full name *</Text>
          <TextInput
            mode="outlined"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your full name"
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <Text style={styles.label}>Email (optional)</Text>
          <TextInput
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
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

          <CustomButton
            title="Complete Registration"
            onPress={submit}
            loading={loading}
            disabled={loading}
            style={styles.btn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  back: { marginBottom: SPACING.md },
  title: { ...TYPOGRAPHY.h2, color: COLORS.text.primary },
  sub: { ...TYPOGRAPHY.body, color: COLORS.text.secondary, marginTop: SPACING.xs, marginBottom: SPACING.lg },
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
  photoLabel: { ...TYPOGRAPHY.small, color: COLORS.primary, marginTop: 4 },
  label: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: { backgroundColor: COLORS.background, marginBottom: SPACING.sm },
  seg: { marginBottom: SPACING.lg },
  btn: { marginTop: SPACING.lg },
});
