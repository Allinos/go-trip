import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import { rentalAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import CustomButton from '../../components/CustomButton';

const { width } = Dimensions.get('window');

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams();
  const vehicleId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(addDays(new Date(), 3));
  const [booking, setBooking] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await rentalAPI.getVehicle(vehicleId);
        const data = res?.data ?? res;
        if (!cancelled) setVehicle(data?.vehicle ?? data);
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const images =
    vehicle?.images ||
    (vehicle?.image ? [vehicle.image] : []).filter(Boolean) ||
    [];

  const rate = vehicle?.pricePerDay ?? vehicle?.dailyRate ?? vehicle?.price ?? 0;
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  const deposit = vehicle?.deposit ?? 2000;
  const total = days * Number(rate) + Number(deposit);

  const book = async () => {
    try {
      setBooking(true);
      await rentalAPI.book(vehicleId, {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      Alert.alert('Success', 'Rental booked', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  if (loading || !vehicle) {
    return (
      <>
        <Stack.Screen options={{ title: 'Vehicle' }} />
        <LoadingSpinner />
      </>
    );
  }

  const reviews = vehicle.reviews || [];

  return (
    <>
      <Stack.Screen options={{ title: vehicle.name || 'Vehicle' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / width);
            setImgIdx(idx);
          }}
        >
          {(images.length ? images : [null]).map((item, i) => (
            <View key={i}>
              {item ? (
                <Image source={{ uri: item }} style={styles.hero} />
              ) : (
                <View style={[styles.hero, styles.heroPh]}>
                  <MaterialIcons name="directions-car" size={64} color={COLORS.text.tertiary} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
        <Text style={styles.dots}>
          {images.length ? `${imgIdx + 1} / ${images.length}` : ''}
        </Text>

        <Text style={styles.title}>{vehicle.name || vehicle.model}</Text>
        <View style={styles.rateRow}>
          <MaterialIcons name="star" size={18} color={COLORS.warning} />
          <Text style={styles.rating}>{Number(vehicle.rating || 4.5).toFixed(1)}</Text>
          <Text style={styles.reviews}>({vehicle.reviewCount ?? reviews.length} reviews)</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Specifications</Text>
          <Spec label="Type" value={vehicle.type || 'Sedan'} />
          <Spec label="Seats" value={String(vehicle.seats ?? 4)} />
          <Spec label="Fuel" value={vehicle.fuel || 'Petrol'} />
          <Text style={styles.tags}>
            {(vehicle.features || ['AC', 'GPS']).join(' · ')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Owner</Text>
          <Text style={styles.body}>{vehicle.ownerName || vehicle.owner?.name || 'Owner'}</Text>
          <Text style={styles.sub}>{vehicle.ownerPhone || ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.sub}>No reviews yet.</Text>
          ) : (
            reviews.slice(0, 5).map((r, i) => (
              <Text key={i} style={styles.review}>
                ★ {r.rating} — {r.comment || r.text}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Dates</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateBtn}
              onPress={() => setStart((d) => addDays(d, 1))}
            >
              <Text style={styles.dateLbl}>Start</Text>
              <Text style={styles.dateVal}>{format(start, 'dd MMM yyyy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setEnd((d) => addDays(d, 1))}>
              <Text style={styles.dateLbl}>End</Text>
              <Text style={styles.dateVal}>{format(end, 'dd MMM yyyy')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.calc}>
            {days} day(s) × ₹{Number(rate).toFixed(0)} + deposit ₹{Number(deposit).toFixed(0)} = ₹
            {total.toFixed(0)}
          </Text>
        </View>

        <CustomButton title="Book Now" loading={booking} disabled={booking} onPress={book} />
      </ScrollView>
    </>
  );
}

function Spec({ label, value }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACING.xxl },
  hero: { width, height: 220, backgroundColor: COLORS.surface },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  dots: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary, textAlign: 'center', marginVertical: SPACING.xs },
  title: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: SPACING.md, marginTop: SPACING.xs },
  rating: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  reviews: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  card: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
  },
  h: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginBottom: SPACING.sm },
  body: { ...TYPOGRAPHY.body, color: COLORS.text.primary },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 4 },
  tags: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.sm },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  specLabel: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  specVal: { ...TYPOGRAPHY.captionBold, color: COLORS.text.primary },
  review: { ...TYPOGRAPHY.caption, color: COLORS.text.primary, marginBottom: SPACING.xs },
  dateRow: { flexDirection: 'row', gap: SPACING.md },
  dateBtn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  dateLbl: { ...TYPOGRAPHY.small, color: COLORS.text.tertiary },
  dateVal: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginTop: 4 },
  calc: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.md },
});
