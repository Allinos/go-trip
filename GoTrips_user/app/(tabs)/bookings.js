import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import BookingCard from '../../components/BookingCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { rideAPI } from '../../services/api';

const SEGMENTS = [
  { key: 'active', label: 'Active', param: { status: 'active' } },
  { key: 'past', label: 'Past', param: { status: 'past' } },
  { key: 'cancelled', label: 'Cancelled', param: { status: 'cancelled' } },
];

export default function BookingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const seg = SEGMENTS.find((s) => s.key === tab);
      const res = await rideAPI.getMyBookings(seg?.param);
      const d = res?.data?.bookings ?? res?.data ?? res?.bookings ?? res;
      setItems(Array.isArray(d) ? d : []);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [tab, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const onCancel = (b) => {
    Alert.alert('Cancel booking', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            await rideAPI.cancelBooking(b.id || b.bookingId, 'User cancelled');
            load();
          } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
          }
        },
      },
    ]);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.header}>My Bookings</Text>
        <LoadingSpinner />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.header}>My Bookings</Text>
      <View style={styles.seg}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segBtn, tab === s.key && styles.segBtnOn]}
            onPress={() => setTab(s.key)}
          >
            <Text style={[styles.segTxt, tab === s.key && styles.segTxtOn]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item, i) => String(item.id ?? item.bookingId ?? i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="event-busy" size={72} color={COLORS.text.tertiary} />
            <Text style={styles.emptyTitle}>No bookings</Text>
            <Text style={styles.emptySub}>Pull to refresh or book a ride from Home</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onViewDetails={() => router.push(`/ride/${item.rideId || item.id}`)}
            onCancel={onCancel}
            onRebook={() => router.push('/(tabs)')}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  seg: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
  },
  segBtn: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: 10 },
  segBtnOn: { backgroundColor: COLORS.primary },
  segTxt: { ...TYPOGRAPHY.captionBold, color: COLORS.text.secondary },
  segTxtOn: { color: COLORS.text.white },
  list: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxl },
  emptyList: { flexGrow: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: SPACING.xxl },
  emptyTitle: { ...TYPOGRAPHY.h4, color: COLORS.text.primary, marginTop: SPACING.md },
  emptySub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.xs, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
