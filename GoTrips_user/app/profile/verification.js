import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Menu, Button } from 'react-native-paper';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, DOCUMENT_TYPES } from '../../constants';
import CustomButton from '../../components/CustomButton';

export default function VerificationScreen() {
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [docNumber, setDocNumber] = useState('');
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [status, setStatus] = useState('Not submitted');
  const [loading, setLoading] = useState(false);

  const pick = async (setter) => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert('Permission', 'Photo access required');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) setter(res.assets[0]);
  };

  const submit = async () => {
    if (!docNumber.trim()) {
      Alert.alert('Error', 'Document number is required');
      return;
    }
    if (!front) {
      Alert.alert('Error', 'Front photo is required');
      return;
    }
    if (docType.requiresBack && !back) {
      Alert.alert('Error', 'Back photo is required for this document');
      return;
    }
    if (!selfie) {
      Alert.alert('Error', 'Selfie is required');
      return;
    }
    try {
      setLoading(true);
      // Wire to your KYC API when available
      await new Promise((r) => setTimeout(r, 600));
      setStatus('Pending review');
      Alert.alert('Submitted', 'We will notify you once verified.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const PhotoBox = ({ label, asset, onPick }) => (
    <TouchableOpacity style={styles.box} onPress={onPick} activeOpacity={0.85}>
      {asset?.uri ? (
        <Image source={{ uri: asset.uri }} style={styles.boxImg} />
      ) : (
        <View style={styles.boxPh}>
          <MaterialIcons name="add-a-photo" size={32} color={COLORS.primary} />
          <Text style={styles.boxLbl}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Verification' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.status}>
            Status: <Text style={styles.statusVal}>{status}</Text>
          </Text>

          <Text style={styles.label}>Document type</Text>
          <Menu visible={menuOpen} onDismiss={() => setMenuOpen(false)} anchor={
            <Button mode="outlined" onPress={() => setMenuOpen(true)} textColor={COLORS.text.primary}>
              {docType.label}
            </Button>
          }>
            {DOCUMENT_TYPES.map((d) => (
              <Menu.Item
                key={d.id}
                onPress={() => {
                  setDocType(d);
                  setMenuOpen(false);
                }}
                title={d.label}
              />
            ))}
          </Menu>

          <Text style={styles.label}>Document number</Text>
          <TextInput
            mode="outlined"
            value={docNumber}
            onChangeText={setDocNumber}
            style={styles.input}
            outlineColor={COLORS.border}
            activeOutlineColor={COLORS.primary}
          />

          <Text style={styles.label}>Front</Text>
          <PhotoBox label="Upload front" asset={front} onPick={() => pick(setFront)} />

          {docType.requiresBack ? (
            <>
              <Text style={styles.label}>Back</Text>
              <PhotoBox label="Upload back" asset={back} onPick={() => pick(setBack)} />
            </>
          ) : null}

          <Text style={styles.label}>Selfie</Text>
          <PhotoBox label="Upload selfie" asset={selfie} onPick={() => pick(setSelfie)} />

          <CustomButton title="Submit" onPress={submit} loading={loading} disabled={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  status: { ...TYPOGRAPHY.body, color: COLORS.text.secondary, marginBottom: SPACING.lg },
  statusVal: { fontWeight: '700', color: COLORS.primary },
  label: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: { backgroundColor: COLORS.background, marginBottom: SPACING.sm },
  box: {
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  boxImg: { width: '100%', height: '100%' },
  boxPh: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  boxLbl: { ...TYPOGRAPHY.caption, color: COLORS.primary, marginTop: SPACING.xs },
});
