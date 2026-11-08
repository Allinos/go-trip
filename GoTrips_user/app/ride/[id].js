import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, ErrorView, Header, Input, KV, Loading, Notice, Pill, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import useRequireLogin from '../../hooks/useRequireLogin';
import useAuthStore from '../../store/authStore';
import { bookingAPI, errorMessage, tripAPI } from '../../services/api';
import { contactPartner } from '../../utils/contact';
import { COLORS, SPACING, TYPOGRAPHY, VEHICLE_LABELS } from '../../constants';
import { dateLabel, rupees, timeLabel } from '../../utils/format';

/** Trip details + send a booking request (choose pickup/drop stop and seats). */
export default function TripScreen() {
  const p = useLocalSearchParams();
  const router = useRouter();
  const requireLogin = useRequireLogin();
  const user = useAuthStore((s) => s.user);
  const { data: t, error, loading, reload } = useFetch(() => tripAPI.get(p.id), [p.id]);
  const [pickup, setPickup] = useState(Number(p.pickupSeq ?? 0));
  const [drop, setDrop] = useState(p.dropSeq != null ? Number(p.dropSeq) : null);
  const [seats, setSeats] = useState(Number(p.seats || 1));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (t && drop == null) setDrop(t.stops.length - 1);
  }, [t, drop]);

  const fare = useMemo(() => {
    if (!t || drop == null) return 0;
    const last = t.stops.length - 1;
    const at = (i) => (i === 0 ? 0 : i === last ? (t.stops[i].fareFromStart ?? t.pricePerSeat) : t.stops[i].fareFromStart);
    const a = at(pickup);
    const b = at(drop);
    return (a != null && b != null && b > a ? b - a : t.pricePerSeat) * seats;
  }, [t, pickup, drop, seats]);

  if (loading) return (<><Header title="Trip" /><Loading /></>);
  if (error) return (<><Header title="Trip" /><ErrorView message={error} onRetry={reload} /></>);

  const closed = t.status !== 'scheduled' || !t.bookingOpen || new Date(t.departureAt) < new Date();
  const request = () =>
    requireLogin(async () => {
      setBusy(true);
      try {
        const r = await bookingAPI.create({ tripId: t.id, seats, pickupSeq: pickup, dropSeq: drop, note: note.trim() || undefined, passengerName: user?.fullName || undefined });
        router.replace(`/booking/${r.data.id}`);
      } catch (e) {
        Alert.alert('Could not send request', errorMessage(e));
      } finally {
        setBusy(false);
      }
    }, 'to request seats');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t.tripType === 'return' ? 'Return trip' : 'Trip details'} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 140 }}>
        <Card style={{ marginBottom: SPACING.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={TYPOGRAPHY.h4}>
              {dateLabel(t.departureAt)}, {timeLabel(t.departureAt)}
            </Text>
            <Pill text={`${t.availableSeats} seats left`} color={COLORS.success} bg="#ECFDF5" />
          </Row>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginTop: 4, marginBottom: 10 }]}>Tap where you will get on and get off</Text>
          {t.stops.map((s, i) => {
            const isPick = i === pickup;
            const isDrop = i === drop;
            const inRange = drop != null && i > pickup && i < drop;
            return (
              <Pressable
                key={s.seq}
                onPress={() => {
                  if (i < t.stops.length - 1 && (drop == null || i < drop) && !isPick) setPickup(i);
                  else if (i > pickup) setDrop(i);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
              >
                <View style={{ alignItems: 'center', width: 20 }}>
                  <MaterialIcons name={isPick ? 'trip-origin' : isDrop ? 'place' : 'circle'} size={isPick || isDrop ? 20 : 10} color={isPick ? COLORS.success : isDrop || inRange ? COLORS.primary : COLORS.text.tertiary} />
                </View>
                <Text style={[TYPOGRAPHY.body, { flex: 1 }, (isPick || isDrop) && { fontWeight: '700' }]}>{s.placeName}</Text>
                {isPick && <Pill text="Get on" color={COLORS.success} bg="#ECFDF5" />}
                {isDrop && <Pill text="Get off" />}
              </Pressable>
            );
          })}
          <Button small variant="ghost" icon="map" title="View route on Google Maps" onPress={() => Linking.openURL(t.routeMapsUrl)} style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 0 }} />
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <Row gap={12}>
            {t.driver.photoUrl ? <Image source={{ uri: t.driver.photoUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="person" size={26} color={COLORS.primary} /></View>}
            <View style={{ flex: 1 }}>
              <Row gap={6}>
                <Text style={TYPOGRAPHY.bodyBold}>{t.driver.name}</Text>
                {t.driver.isVerified && <MaterialIcons name="verified" size={18} color={COLORS.success} />}
              </Row>
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>
                {t.vehicle.make} {t.vehicle.model} · {VEHICLE_LABELS[t.vehicle.vehicleClass]} {t.vehicle.color ? `· ${t.vehicle.color}` : ''} {t.vehicle.hasAc ? '· AC' : ''}
              </Text>
            </View>
          </Row>
          {t.vehicle.photo && <Image source={{ uri: t.vehicle.photo }} style={{ width: '100%', height: 150, borderRadius: 10, marginTop: 10 }} />}
          {t.notes ? <Text style={[TYPOGRAPHY.caption, { marginTop: 10, color: COLORS.text.secondary }]}>“{t.notes}”</Text> : null}
          <Row style={{ marginTop: 12 }}>
            <Button style={{ flex: 1 }} small variant="outline" icon="call" title="Call driver" onPress={() => requireLogin(() => contactPartner('trip', t.id), 'to call the driver')} />
            <Button style={{ flex: 1 }} small variant="outline" icon="chat" title="WhatsApp" onPress={() => requireLogin(() => contactPartner('trip', t.id, 'whatsapp'), 'to message the driver')} />
          </Row>
        </Card>

        {t.myBooking && ['pending', 'accepted'].includes(t.myBooking.status) ? (
          <Notice title="You already requested this trip" text={`Status: ${t.myBooking.status === 'accepted' ? 'Confirmed' : 'Waiting for driver'}`} />
        ) : closed ? (
          <Notice title="Bookings closed" text="This trip is no longer taking requests." color={COLORS.text.secondary} bg={COLORS.divider} />
        ) : (
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <Text style={TYPOGRAPHY.bodyBold}>Seats</Text>
              <Row>
                <Pressable onPress={() => setSeats(Math.max(1, seats - 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="remove" size={20} color={COLORS.primary} />
                </Pressable>
                <Text style={[TYPOGRAPHY.h4, { minWidth: 28, textAlign: 'center' }]}>{seats}</Text>
                <Pressable onPress={() => setSeats(Math.min(t.availableSeats, seats + 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="add" size={20} color={COLORS.primary} />
                </Pressable>
              </Row>
            </Row>
            <Input label="Message for driver (optional)" value={note} onChangeText={setNote} placeholder="e.g. I will wait near the petrol pump" maxLength={300} />
            <KV label="Fare (pay the driver directly)" value={rupees(fare)} />
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>No booking fee. Pay cash or UPI to the driver.</Text>
          </Card>
        )}
      </ScrollView>
      {!closed && !(t.myBooking && ['pending', 'accepted'].includes(t.myBooking.status)) && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <Button title={`Request ${seats} seat${seats > 1 ? 's' : ''} · ${rupees(fare)}`} icon="send" onPress={request} loading={busy} disabled={drop == null || seats > t.availableSeats} />
        </View>
      )}
    </View>
  );
}
