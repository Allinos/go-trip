import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import { rideAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import CustomButton from '../../components/CustomButton';

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams();
  const rideId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seats, setSeats] = useState(1);
  const [note, setNote] = useState('');
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await rideAPI.getById(rideId);
        const data = res?.data ?? res;
        if (!cancelled) setRide(data?.ride ?? data);
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rideId]);

  const confirm = async () => {
    try {
      setBooking(true);
      await rideAPI.book(rideId, { seats, specialRequests: note });
      Alert.alert('Success', 'Booking confirmed', [{ text: 'OK', onPress: () => router.replace('/(tabs)/bookings') }]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setBooking(false);
    }
  };

  if (loading || !ride) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ride' }} />
        <LoadingSpinner />
      </>
    );
  }

  const region = {
    latitude: ride.pickupLat || ride.fromLat || 17.4486,
    longitude: ride.pickupLng || ride.fromLng || 78.3908,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const fare = ride.price ?? ride.fare ?? ride.perSeat ?? 0;
  const platform = ride.platformFee ?? 0;
  const tax = ride.tax ?? 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Ride details' }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.h}>Vehicle & driver</Text>
            <Text style={styles.body}>{ride.vehicleName || ride.title}</Text>
            <Text style={styles.sub}>{ride.driverName || ride.driver?.name || 'Driver'}</Text>
          </View>

          <View style={styles.mapWrap}>
            <MapView style={styles.map} initialRegion={region} scrollEnabled={false}>
              <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Pickup" />
              {ride.dropLat != null && ride.dropLng != null ? (
                <Marker
                  coordinate={{ latitude: ride.dropLat, longitude: ride.dropLng }}
                  title="Drop"
                  pinColor={COLORS.primary}
                />
              ) : null}
              {ride.path?.length ? (
                <Polyline coordinates={ride.path} strokeColor={COLORS.primary} strokeWidth={3} />
              ) : null}
            </MapView>
          </View>

          <View style={styles.card}>
            <Text style={styles.h}>Trip</Text>
            <Text style={styles.body}>
              {ride.date || ride.scheduledAt || ''} · {ride.time || ''}
            </Text>
            <Text style={styles.sub}>Seats available: {ride.seatsAvailable ?? ride.seats ?? '—'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.h}>Pricing</Text>
            <Row label="Fare" value={`₹${Number(fare).toFixed(0)}`} />
            <Row label="Platform fee" value={`₹${Number(platform).toFixed(0)}`} />
            <Row label="Taxes" value={`₹${Number(tax).toFixed(0)}`} />
            <Row label="Total" value={`₹${(Number(fare) + Number(platform) + Number(tax)).toFixed(0)}`} bold />
          </View>

          <View style={styles.card}>
            <Text style={styles.h}>Seats</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={String(seats)}
              onChangeText={(t) => setSeats(Math.max(1, parseInt(t, 10) || 1))}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.h}>Special requests</Text>
            <TextInput
              style={[styles.input, styles.area]}
              multiline
              placeholder="Any notes for the driver"
              placeholderTextColor={COLORS.text.tertiary}
              value={note}
              onChangeText={setNote}
            />
          </View>

          <CustomButton title="Confirm Booking" loading={booking} disabled={booking} onPress={confirm} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function Row({ label, value, bold }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowVal, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  h: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginBottom: SPACING.xs },
  body: { ...TYPOGRAPHY.body, color: COLORS.text.primary },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 4 },
  mapWrap: {
    height: 200,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  map: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SPACING.xs },
  rowLabel: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  rowVal: { ...TYPOGRAPHY.caption, color: COLORS.text.primary },
  bold: { fontWeight: '700', color: COLORS.text.primary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    ...TYPOGRAPHY.body,
    color: COLORS.text.primary,
    marginTop: SPACING.sm,
  },
  area: { minHeight: 88, textAlignVertical: 'top' },
});
