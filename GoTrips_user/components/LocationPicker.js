import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { locationAPI } from '../services/api';

export default function LocationPicker({ location, onPress, onSelectLocation }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const display = location?.label || location?.address || 'Hitech City, Hyderabad';

  const openModal = () => {
    setOpen(true);
    if (onPress) onPress();
  };

  const searchPlaces = async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const res = await locationAPI.search(q);
      const list = res?.data?.locations ?? res?.data ?? res?.locations ?? [];
      setResults(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const pickItem = (item) => {
    const loc = {
      label: item.name || item.label || item.address,
      address: item.address || item.formattedAddress || item.name,
      lat: item.lat ?? item.latitude,
      lng: item.lng ?? item.longitude,
    };
    onSelectLocation?.(loc);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={openModal} activeOpacity={0.9}>
        <MaterialIcons name="place" size={22} color={COLORS.primary} />
        <View style={styles.textCol}>
          <Text style={styles.label}>YOUR LOCATION</Text>
          <View style={styles.row}>
            <Text style={styles.value} numberOfLines={1}>
              {display}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={22} color={COLORS.text.secondary} />
          </View>
        </View>
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select location</Text>
          <TextInput
            style={styles.input}
            placeholder="Search area..."
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              searchPlaces(t);
            }}
            placeholderTextColor={COLORS.text.tertiary}
          />
          <FlatList
            data={results}
            keyExtractor={(item, i) => String(item.id ?? item.placeId ?? i)}
            ListEmptyComponent={
              loading ? (
                <Text style={styles.hint}>Searching…</Text>
              ) : query.length >= 2 ? (
                <Text style={styles.hint}>No results</Text>
              ) : (
                <Text style={styles.hint}>Type to search</Text>
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => pickItem(item)}>
                <MaterialIcons name="place" size={20} color={COLORS.primary} />
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.name || item.label || item.address}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  textCol: { flex: 1 },
  label: {
    ...TYPOGRAPHY.tiny,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  value: {
    ...TYPOGRAPHY.bodyBold,
    color: COLORS.text.primary,
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  sheetTitle: { ...TYPOGRAPHY.h4, color: COLORS.text.primary, marginBottom: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  itemText: { ...TYPOGRAPHY.body, color: COLORS.text.primary, flex: 1 },
  hint: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary, textAlign: 'center', padding: SPACING.lg },
});
