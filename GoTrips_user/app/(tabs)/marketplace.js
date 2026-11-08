import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import DriverCard from '../../components/DriverCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { marketplaceAPI } from '../../services/api';

export default function MarketplaceScreen() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await marketplaceAPI.searchDrivers({ query: q });
      const d = res?.data?.drivers ?? res?.data ?? res?.drivers ?? res;
      setDrivers(Array.isArray(d) ? d : []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, []);

  if (loading && drivers.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>Driver marketplace</Text>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>Driver marketplace</Text>
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={22} color={COLORS.text.tertiary} />
        <TextInput
          style={styles.input}
          placeholder="Search drivers..."
          placeholderTextColor={COLORS.text.tertiary}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={load}
        />
        <TouchableOpacity onPress={load}>
          <MaterialIcons name="arrow-forward" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chips}>
        <Text style={styles.chipHint}>Filters: Experience · Rating · Languages · Location</Text>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item, i) => String(item.id ?? i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No drivers found.</Text>}
        renderItem={({ item }) => (
          <DriverCard driver={item} onPress={(d) => router.push(`/marketplace/${d.id}`)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  input: { flex: 1, paddingVertical: SPACING.sm, marginLeft: SPACING.sm, ...TYPOGRAPHY.body, color: COLORS.text.primary },
  chips: { paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  chipHint: { ...TYPOGRAPHY.small, color: COLORS.text.tertiary },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  empty: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, textAlign: 'center', marginTop: SPACING.xl },
});
