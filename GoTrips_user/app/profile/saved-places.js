import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import { userAPI, locationAPI } from '../../services/api';
import CustomButton from '../../components/CustomButton';
import LoadingSpinner from '../../components/LoadingSpinner';

const LABEL_ICONS = {
  home: 'home',
  work: 'work',
  other: 'place',
};

export default function SavedPlacesScreen() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [label, setLabel] = useState('home');
  const [address, setAddress] = useState('');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const load = useCallback(async () => {
    try {
      const res = await userAPI.getSavedLocations();
      const d = res?.data?.locations ?? res?.data ?? res?.locations ?? [];
      setPlaces(Array.isArray(d) ? d : []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const searchAddr = async (q) => {
    if (!q || q.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await locationAPI.search(q);
      const list = res?.data?.locations ?? res?.data ?? res?.locations ?? [];
      setSuggestions(Array.isArray(list) ? list : []);
    } catch {
      setSuggestions([]);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setLabel('home');
    setAddress('');
    setQuery('');
    setSuggestions([]);
    setModal(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setLabel(p.labelType || p.type || 'other');
    setAddress(p.address || p.name || '');
    setQuery('');
    setSuggestions([]);
    setModal(true);
  };

  const savePlace = async () => {
    if (!address.trim()) {
      Alert.alert('Error', 'Address is required');
      return;
    }
    try {
      const payload = {
        labelType: label,
        address: address.trim(),
        name: address.trim(),
      };
      if (editing?.id) {
        await userAPI.updateSavedLocation(editing.id, payload);
      } else {
        await userAPI.addSavedLocation(payload);
      }
      setModal(false);
      load();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    }
  };

  const remove = (p) => {
    Alert.alert('Delete', 'Remove this place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await userAPI.deleteSavedLocation(p.id);
            load();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
          }
        },
      },
    ]);
  };

  const iconFor = (p) => {
    const t = (p.labelType || p.type || 'other').toLowerCase();
    return LABEL_ICONS[t] || 'place';
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Saved places' }} />
        <LoadingSpinner />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Saved places' }} />
      <View style={styles.top}>
        <CustomButton title="Add New Place" onPress={openAdd} />
      </View>
      <FlatList
        data={places}
        keyExtractor={(item, i) => String(item.id ?? i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No saved places yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <MaterialIcons name={iconFor(item)} size={24} color={COLORS.primary} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.label || item.labelType || item.type || 'Place'}</Text>
              <Text style={styles.cardAddr} numberOfLines={2}>
                {item.address || item.name}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openEdit(item)} hitSlop={8}>
              <MaterialIcons name="edit" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(item)} hitSlop={8}>
              <MaterialIcons name="delete-outline" size={24} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={modal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalFlex}
        >
          <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setModal(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? 'Edit place' : 'Add place'}</Text>
            <Text style={styles.lbl}>Label</Text>
            <View style={styles.labelRow}>
              {['home', 'work', 'other'].map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.labelChip, label === k && styles.labelChipOn]}
                  onPress={() => setLabel(k)}
                >
                  <Text style={[styles.labelChipTxt, label === k && styles.labelChipTxtOn]}>{k}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.lbl}>Search address</Text>
            <TextInput
              style={styles.input}
              placeholder="Type to search..."
              value={query}
              onChangeText={(t) => {
                setQuery(t);
                searchAddr(t);
              }}
              placeholderTextColor={COLORS.text.tertiary}
            />
            {suggestions.slice(0, 5).map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.sug}
                onPress={() => {
                  setAddress(s.name || s.address || s.label);
                  setQuery('');
                  setSuggestions([]);
                }}
              >
                <Text style={styles.sugTxt}>{s.name || s.address}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.lbl}>Address on map (text)</Text>
            <TextInput
              style={[styles.input, styles.area]}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholder="Selected or typed address"
              placeholderTextColor={COLORS.text.tertiary}
            />
            <CustomButton title="Save" onPress={savePlace} />
            <TouchableOpacity style={styles.cancel} onPress={() => setModal(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  top: { padding: SPACING.lg },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  empty: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
  },
  cardBody: { flex: 1 },
  cardTitle: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, textTransform: 'capitalize' },
  cardAddr: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 4 },
  modalFlex: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  sheetTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  lbl: { ...TYPOGRAPHY.captionBold, color: COLORS.text.secondary, marginTop: SPACING.sm },
  labelRow: { flexDirection: 'row', gap: SPACING.sm, marginVertical: SPACING.sm },
  labelChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  labelChipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  labelChipTxt: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, textTransform: 'capitalize' },
  labelChipTxtOn: { color: COLORS.primary, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.xs,
    color: COLORS.text.primary,
  },
  area: { minHeight: 72, textAlignVertical: 'top' },
  sug: { paddingVertical: SPACING.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.divider },
  sugTxt: { ...TYPOGRAPHY.body, color: COLORS.text.primary },
  cancel: { alignItems: 'center', padding: SPACING.md },
  cancelTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.secondary },
});
