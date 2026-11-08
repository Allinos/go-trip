import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, FlatList, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import { locationAPI } from '../services/api';
import useRideStore from '../store/rideStore';

export default function SearchCard({
  pickup: pickupProp,
  drop: dropProp,
  onPickupChange,
  onDropChange,
  dateMode: dateModeProp,
  onDateModeChange,
  customDate: customDateProp,
  onCustomDateChange,
}) {
  const router = useRouter();
  const setSearchParams = useRideStore((s) => s.setSearchParams);
  const searchVehicleType = useRideStore((s) => s.searchParams?.vehicleType || 'taxi');

  const [pickup, setPickup] = useState(pickupProp || { label: '', address: '' });
  const [drop, setDrop] = useState(dropProp || { label: '', address: '' });
  const [dateMode, setDateMode] = useState(dateModeProp || 'today');
  const [internalCustomDate, setInternalCustomDate] = useState(() => new Date().toISOString());
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const syncPickup = useCallback(
    (v) => {
      setPickup(v);
      onPickupChange?.(v);
    },
    [onPickupChange]
  );
  const syncDrop = useCallback(
    (v) => {
      setDrop(v);
      onDropChange?.(v);
    },
    [onDropChange]
  );

  const setMode = (m) => {
    setDateMode(m);
    onDateModeChange?.(m);
  };

  const searchPlaces = async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const res = await locationAPI.search(q);
      const list = res?.data?.locations ?? res?.data ?? res?.locations ?? [];
      setResults(Array.isArray(list) ? list : []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      setResults([]);
    }
  };

  const openSearch = (field) => {
    setModal(field);
    setQuery('');
    setResults([]);
  };

  const selectPlace = (item) => {
    const loc = {
      label: item.name || item.label || item.address,
      address: item.address || item.formattedAddress || item.name,
      lat: item.lat ?? item.latitude,
      lng: item.lng ?? item.longitude,
    };
    if (modal === 'pickup') syncPickup(loc);
    else syncDrop(loc);
    setModal(null);
  };

  const swap = () => {
    const a = pickup;
    syncPickup(drop);
    syncDrop(a);
  };

  const handleSearch = () => {
    if (!pickup.address && !pickup.label) {
      Alert.alert('Error', 'Please select pickup');
      return;
    }
    if (!drop.address && !drop.label) {
      Alert.alert('Error', 'Please select drop');
      return;
    }
    const customEff = customDateProp ?? internalCustomDate;
    const rideDate =
      dateMode === 'tomorrow'
        ? new Date(Date.now() + 86400000).toISOString()
        : dateMode === 'custom' && customEff
          ? customEff
          : new Date().toISOString();

    setSearchParams({
      pickup,
      drop,
      date: rideDate,
      vehicleType: searchVehicleType,
      seats: useRideStore.getState().searchParams?.seats || 1,
    });

    router.push({
      pathname: '/search/results',
      params: {
        pickup: pickup.label || pickup.address,
        drop: drop.label || drop.address,
        date: rideDate,
      },
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.fieldRow}>
        <MaterialIcons name="fiber-manual-record" size={14} color={COLORS.primary} style={styles.dot} />
        <TouchableOpacity style={styles.fieldTap} onPress={() => openSearch('pickup')}>
          <Text style={styles.ph}>Pickup location</Text>
          <Text style={styles.val} numberOfLines={1}>
            {pickup.label || pickup.address || 'Where from?'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.swapWrap}>
        <TouchableOpacity style={styles.swap} onPress={swap}>
          <MaterialIcons name="swap-vert" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.fieldRow}>
        <MaterialIcons name="place" size={20} color={COLORS.text.tertiary} style={styles.dot} />
        <TouchableOpacity style={styles.fieldTap} onPress={() => openSearch('drop')}>
          <Text style={styles.ph}>Drop location</Text>
          <Text style={styles.val} numberOfLines={1}>
            {drop.label || drop.address || 'Where to?'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>WHEN DO YOU WANT TO RIDE?</Text>
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={[styles.chip, dateMode === 'today' && styles.chipFilled]}
          onPress={() => setMode('today')}
        >
          <Text style={[styles.chipText, dateMode === 'today' && styles.chipTextInv]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, dateMode === 'tomorrow' && styles.chipFilled]}
          onPress={() => setMode('tomorrow')}
        >
          <Text style={[styles.chipText, dateMode === 'tomorrow' && styles.chipTextInv]}>Tomorrow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chipIcon, dateMode === 'custom' && styles.chipFilled]}
          onPress={() => {
            const iso = new Date().toISOString();
            setInternalCustomDate(iso);
            setMode('custom');
            onCustomDateChange?.(iso);
          }}
        >
          <MaterialIcons name="calendar-today" size={20} color={dateMode === 'custom' ? COLORS.text.white : COLORS.primary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} activeOpacity={0.9}>
        <Text style={styles.searchBtnText}>Search Rides</Text>
      </TouchableOpacity>

      <Modal visible={!!modal} animationType="slide" transparent>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModal(null)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{modal === 'pickup' ? 'Pickup' : 'Drop'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Search..."
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              searchPlaces(t);
            }}
            placeholderTextColor={COLORS.text.tertiary}
            autoFocus={Platform.OS !== 'web'}
          />
          <FlatList
            data={results}
            keyExtractor={(item, i) => String(item.id ?? i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => selectPlace(item)}>
                <MaterialIcons name="place" size={20} color={COLORS.primary} />
                <Text style={styles.itemText} numberOfLines={2}>
                  {item.name || item.label || item.address}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.hint}>Type at least 2 characters</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  dot: { marginTop: 4 },
  fieldTap: { flex: 1, paddingVertical: SPACING.sm },
  ph: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary },
  val: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  swapWrap: { alignItems: 'center', marginVertical: -4 },
  swap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    ...TYPOGRAPHY.small,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    marginTop: SPACING.md,
    letterSpacing: 0.4,
  },
  dateRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  chip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.background,
  },
  chipFilled: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },
  chipTextInv: { color: COLORS.text.white },
  searchBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.white },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  sheetTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.md },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.text.primary,
    marginBottom: SPACING.md,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.sm },
  itemText: { ...TYPOGRAPHY.body, flex: 1, color: COLORS.text.primary },
  hint: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary, textAlign: 'center', padding: SPACING.lg },
});
