import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import VehicleCard from '../../components/VehicleCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import useRentalStore from '../../store/rentalStore';

export default function RentalScreen() {
  const router = useRouter();
  const { vehicles, searchVehicles, loading } = useRentalStore();
  const [q, setQ] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      await searchVehicles({ query: q });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    }
  }, [q, searchVehicles]);

  useEffect(() => {
    load();
  }, []);

  const onSearch = () => load();

  if (loading && vehicles.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>Rent a vehicle</Text>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Rent a vehicle</Text>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color={COLORS.text.tertiary} />
          <TextInput
            style={styles.input}
            placeholder="Search cars, SUVs..."
            placeholderTextColor={COLORS.text.tertiary}
            value={q}
            onChangeText={setQ}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
          <MaterialIcons name="tune" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        key="rental-grid"
        data={vehicles}
        keyExtractor={(item, i) => String(item.id ?? i)}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>No vehicles found. Try another search.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <VehicleCard vehicle={item} onPress={(v) => router.push(`/rental/${v.id}`)} />
          </View>
        )}
      />

      <Modal visible={filterOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setFilterOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filters</Text>
          <Text style={styles.sheetHint}>Type, price range, and features can be wired to your API params.</Text>
          <TouchableOpacity style={styles.apply} onPress={() => setFilterOpen(false)}>
            <Text style={styles.applyText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchRow: { flexDirection: 'row', paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.md },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: { flex: 1, paddingVertical: SPACING.sm, marginLeft: SPACING.sm, ...TYPOGRAPHY.body, color: COLORS.text.primary },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  row: { justifyContent: 'space-between', paddingHorizontal: SPACING.lg },
  list: { paddingBottom: SPACING.xxl },
  cell: { width: '48%' },
  empty: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.xl },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  sheetTitle: { ...TYPOGRAPHY.h4, marginBottom: SPACING.sm },
  sheetHint: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  apply: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  applyText: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.white },
});
