import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
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
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';
import { Stars } from '../../components/Stars';

/** Trip details + send a booking request (choose pickup/drop stop and seats). */
/** Send the trip to family or a travel buddy (WhatsApp, SMS…). */
function shareTrip(trip) {
  const message = t("{0} → {1}, {2} at {3}. {4} per seat. Find it in the GoTrip app.", [trip.originName, trip.destinationName, dateLabel(trip.departureAt), timeLabel(trip.departureAt), rupees(trip.pricePerSeat)]);
  Share.share({ message }).catch(() => {});
}

export default function TripScreen() {
  const p = useLocalSearchParams();
  const router = useRouter();
  const requireLogin = useRequireLogin();
  const user = useAuthStore((s) => s.user);
  const { data: trip, error, errorStatus, loading, reload } = useFetch(() => tripAPI.get(p.id), [p.id]);
  const [pickup, setPickup] = useState(Number(p.pickupSeq ?? 0));
  const [drop, setDrop] = useState(p.dropSeq != null ? Number(p.dropSeq) : null);
  const [seats, setSeats] = useState(Number(p.seats || 1));
  const [note, setNote] = useState('');
  const [goodsType, setGoodsType] = useState('');
  const [loadKg, setLoadKg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (trip && drop == null) setDrop(trip.stops.length - 1);
  }, [trip, drop]);

  const fare = useMemo(() => {
    if (!trip || drop == null) return 0;
    const last = trip.stops.length - 1;
    const at = (i) => (i === 0 ? 0 : i === last ? (trip.stops[i].fareFromStart ?? trip.pricePerSeat) : trip.stops[i].fareFromStart);
    const a = at(pickup);
    const b = at(drop);
    if (trip.kind === 'goods') return trip.pricePerSeat; // the whole vehicle is hired for the route
    return (a != null && b != null && b > a ? b - a : trip.pricePerSeat) * seats;
  }, [trip, pickup, drop, seats]);

  if (loading) return (<><Header title={t("Trip")} /><Loading /></>);
  if (error) return (<><Header title={t("Trip")} /><ErrorView message={error} status={errorStatus} onRetry={reload} /></>);

  const goods = trip.kind === 'goods';
  const closed = trip.status !== 'scheduled' || !trip.bookingOpen || new Date(trip.departureAt) < new Date();
  const request = () =>
    requireLogin(async () => {
      setBusy(true);
      try {
        const r = await bookingAPI.create({ tripId: trip.id, seats: goods ? 1 : seats, pickupSeq: pickup, dropSeq: drop, note: note.trim() || undefined, passengerName: user?.fullName || undefined, ...(goods ? { goodsType: goodsType.trim(), loadKg: loadKg ? Number(loadKg) : undefined } : {}) });
        router.replace(`/booking/${r.data.id}`);
      } catch (e) {
        Alert.alert(t("Could not send request"), errorMessage(e));
      } finally {
        setBusy(false);
      }
    }, 'to request seats');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header
        title={trip.tripType === 'return' ? t("Return trip") : t("Trip details")}
        right={<MaterialIcons name="share" size={22} color={COLORS.primary} accessibilityLabel={t("Share")} onPress={() => shareTrip(trip)} />}
      />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 140 }}>
        <Card style={{ marginBottom: SPACING.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={TYPOGRAPHY.h4}>
              {dateLabel(trip.departureAt)}{", "}{timeLabel(trip.departureAt)}
            </Text>
            <Pill text={goods ? t("Goods · up to {0} kg", [trip.capacityKg]) : t("{0} seats left", [trip.availableSeats])} color={COLORS.success} bg="#ECFDF5" />
          </Row>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginTop: 4, marginBottom: 10 }]}>{goods ? t("Tap where the goods are loaded and unloaded") : t("Tap where you will get on and get off")}</Text>
          {trip.stops.map((s, i) => {
            const isPick = i === pickup;
            const isDrop = i === drop;
            const inRange = drop != null && i > pickup && i < drop;
            return (
              <Pressable
                key={s.seq}
                onPress={() => {
                  if (i < trip.stops.length - 1 && (drop == null || i < drop) && !isPick) setPickup(i);
                  else if (i > pickup) setDrop(i);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }}
              >
                <View style={{ alignItems: 'center', width: 20 }}>
                  <MaterialIcons name={isPick ? 'trip-origin' : isDrop ? 'place' : 'circle'} size={isPick || isDrop ? 20 : 10} color={isPick ? COLORS.success : isDrop || inRange ? COLORS.primary : COLORS.text.tertiary} />
                </View>
                <Text style={[TYPOGRAPHY.body, { flex: 1 }, (isPick || isDrop) && { fontWeight: '700' }]}>{s.placeName}</Text>
                {isPick && <Pill text={goods ? t("Loading") : t("Get on")} color={COLORS.success} bg="#ECFDF5" />}
                {isDrop && <Pill text={goods ? t("Unloading") : t("Get off")} />}
              </Pressable>
            );
          })}
          <Button small variant="ghost" icon="map" title={t("View route on Google Maps")} onPress={() => Linking.openURL(trip.routeMapsUrl)} style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 0 }} />
        </Card>

        <Card style={{ marginBottom: SPACING.md }}>
          <Row gap={12}>
            {trip.driver.photoUrl ? <CachedImage uri={trip.driver.photoUrl} style={{ width: 48, height: 48, borderRadius: 24 }} /> : <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="person" size={26} color={COLORS.primary} /></View>}
            <View style={{ flex: 1 }}>
              <Row gap={6}>
                <Text style={TYPOGRAPHY.bodyBold}>{trip.driver.name}</Text>
                {trip.driver.isVerified && <MaterialIcons name="verified" size={18} color={COLORS.success} />}
              </Row>
              {trip.driver.rating ? <Stars value={trip.driver.rating.average} count={trip.driver.rating.count} size={13} /> : <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{t("New on GoTrip")}</Text>}
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>
                {trip.vehicle.make} {trip.vehicle.model}{" · "}{VEHICLE_LABELS[trip.vehicle.vehicleClass]} {trip.vehicle.color ? `· ${trip.vehicle.color}` : ''} {trip.vehicle.hasAc ? t("· AC") : ''}
              </Text>
            </View>
          </Row>
          {trip.vehicle.photo && <CachedImage uri={trip.vehicle.photo} style={{ width: '100%', height: 150, borderRadius: 10, marginTop: 10 }} />}
          {trip.notes ? <Text style={[TYPOGRAPHY.caption, { marginTop: 10, color: COLORS.text.secondary }]}>“{trip.notes}”</Text> : null}
          {trip.reviews?.length > 0 && (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, fontWeight: '700' }]}>{t("WHAT PASSENGERS SAY")}</Text>
              {trip.reviews.map((r) => (
                <View key={r.id} style={{ backgroundColor: COLORS.surface, borderRadius: 8, padding: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Stars value={r.rating} size={12} />
                    <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{r.by || ''}</Text>
                  </Row>
                  {r.comment ? <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>{r.comment}</Text> : null}
                </View>
              ))}
            </View>
          )}
          <Row style={{ marginTop: 12 }}>
            <Button style={{ flex: 1 }} small variant="outline" icon="call" title={t("Call driver")} onPress={() => requireLogin(() => contactPartner('trip', trip.id), 'to call the driver')} />
            <Button style={{ flex: 1 }} small variant="outline" icon="chat" title={t("WhatsApp")} onPress={() => requireLogin(() => contactPartner('trip', trip.id, 'whatsapp'), 'to message the driver')} />
          </Row>
        </Card>

        {trip.myBooking && ['pending', 'accepted'].includes(trip.myBooking.status) ? (
          <Notice title={t("You already requested this trip")} text={t(
            "Status: {0}",
            [trip.myBooking.status === 'accepted' ? 'Confirmed' : 'Waiting for driver']
          )} />
        ) : closed ? (
          <Notice title={t("Bookings closed")} text={t("This trip is no longer taking requests.")} color={COLORS.text.secondary} bg={COLORS.divider} />
        ) : (
          goods ? (
            <Card>
              <Text style={[TYPOGRAPHY.bodyBold, { marginBottom: SPACING.sm }]}>{t("Hire the whole vehicle")}</Text>
              <Input label={t("What do you want to send?")} value={goodsType} onChangeText={setGoodsType} placeholder={t("e.g. Cement bags, furniture, rice")} maxLength={80} />
              <Input label={t("Approx. weight in kg (optional)")} value={loadKg} onChangeText={(x) => setLoadKg(x.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" placeholder={t("Up to {0}", [trip.capacityKg])} />
              <Input label={t("Message for driver (optional)")} value={note} onChangeText={setNote} placeholder={t("e.g. Loading help needed")} maxLength={300} />
              <KV label={t("Hire price (pay the driver directly)")} value={rupees(fare)} />
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{t("No booking fee. Confirm the details with the driver on call.")}</Text>
            </Card>
          ) : (
          <Card>
            <Row style={{ justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <Text style={TYPOGRAPHY.bodyBold}>{t("Seats")}</Text>
              <Row>
                <Pressable onPress={() => setSeats(Math.max(1, seats - 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="remove" size={20} color={COLORS.primary} />
                </Pressable>
                <Text style={[TYPOGRAPHY.h4, { minWidth: 28, textAlign: 'center' }]}>{seats}</Text>
                <Pressable onPress={() => setSeats(Math.min(trip.availableSeats, seats + 1))} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialIcons name="add" size={20} color={COLORS.primary} />
                </Pressable>
              </Row>
            </Row>
            <Input label={t("Message for driver (optional)")} value={note} onChangeText={setNote} placeholder={t("e.g. I will wait near the petrol pump")} maxLength={300} />
            <KV label={t("Fare (pay the driver directly)")} value={rupees(fare)} />
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{t("No booking fee. Pay cash or UPI to the driver.")}</Text>
          </Card>
          )
        )}
      </ScrollView>
      {!closed && !(trip.myBooking && ['pending', 'accepted'].includes(trip.myBooking.status)) && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border }}>
          {goods ? (
            <Button title={t("Request this vehicle · {0}", [rupees(fare)])} icon="send" onPress={request} loading={busy} disabled={drop == null || goodsType.trim().length < 2 || !trip.availableSeats || (loadKg && Number(loadKg) > trip.capacityKg)} />
          ) : (
            <Button title={seats > 1 ? t("Request {0} seats · {1}", [seats, rupees(fare)]) : t("Request 1 seat · {0}", [rupees(fare)])} icon="send" onPress={request} loading={busy} disabled={drop == null || seats > trip.availableSeats} />
          )}
        </View>
      )}
    </View>
  );
}
