import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import useRideStore from '../../store/rideStore';
import LoadingSpinner from '../../components/LoadingSpinner';
import CustomButton from '../../components/CustomButton';

export default function SearchResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const pickup = Array.isArray(params.pickup) ? params.pickup[0] : params.pickup;
  const drop = Array.isArray(params.drop) ? params.drop[0] : params.drop;

  const { rides, searchRides, loading } = useRideStore();
  const [sort, setSort] = useState('price');
  const [chips, setChips] = useState({ type: 'any', price: 'any', seats: '1' });

  const load = useCallback(async () => {
    try {
      await searchRides();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    }
  }, [searchRides]);

  useEffect(() => {
    load();
  }, [load]);

  const sorted = [...rides].sort((a, b) => {
    if (sort === 'price') return (a.price || 0) - (b.price || 0);
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Results',
          headerRight: () => (
            <TouchableOpacity style={{ marginRight: 12 }} onPress={() => {}}>
              <MaterialIcons name="sort" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.routeBar}>
        <Text style={styles.route} numberOfLines={2}>
          {pickup || 'Pickup'} → {drop || 'Drop'}
        </Text>
      </View>

      <View style={styles.chips}>
        {['Economy', 'Premium', '≤ ₹300', '2+ seats'].map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.chip, chips.type === c && styles.chipOn]}
            onPress={() => setChips((s) => ({ ...s, type: c }))}
          >
            <Text style={[styles.chipTxt, chips.type === c && styles.chipTxtOn]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sort by</Text>
        {['price', 'rating', 'time'].map((s) => (
          <TouchableOpacity key={s} onPress={() => setSort(s)} style={styles.sortBtn}>
            <Text style={[styles.sortTxt, sort === s && styles.sortTxtOn]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && sorted.length === 0 ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No rides found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                {item.image || item.vehicleImage ? (
                  <Image source={{ uri: item.image || item.vehicleImage }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]}>
                    <MaterialIcons name="directions-car" size={32} color={COLORS.text.tertiary} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.vName}>{item.vehicleName || item.title || 'Ride'}</Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    {item.distance ? `${item.distance} km · ` : ''}
                    {item.departureTime || item.time || ''}
                  </Text>
                  <Text style={styles.meta}>Seats: {item.seatsAvailable ?? item.seats ?? '—'}</Text>
                </View>
                <Text style={styles.price}>₹{item.price ?? item.fare ?? '—'}</Text>
              </View>
              <CustomButton
                title="Book Now"
                onPress={() => router.push(`/ride/${item.id}`)}
                style={styles.bookBtn}
              />
            </View>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  routeBar: { padding: SPACING.md, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  route: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, padding: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipTxt: { ...TYPOGRAPHY.small, color: COLORS.text.secondary },
  chipTxtOn: { color: COLORS.primary, fontWeight: '600' },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  sortLabel: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary },
  sortBtn: { paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  sortTxt: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, textTransform: 'capitalize' },
  sortTxtOn: { color: COLORS.primary, fontWeight: '700' },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  empty: { textAlign: 'center', ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.xl },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTop: { flexDirection: 'row', gap: SPACING.md },
  thumb: { width: 72, height: 72, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surface },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  vName: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  meta: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 2 },
  price: { ...TYPOGRAPHY.h4, color: COLORS.primary },
  bookBtn: { marginTop: SPACING.md, height: 44 },
});
