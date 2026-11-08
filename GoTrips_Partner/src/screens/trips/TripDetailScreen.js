import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, PromptModal, Row, Screen, Section, ToggleRow } from '../../components/ui';
import BookingCard from '../../components/BookingCard';
import LocationShareCard from '../../components/LocationShareCard';
import { tripApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { dateTimeLabel, rupees } from '../../utils/format';
import { confirm } from '../../utils/confirm';
import { t } from '../../i18n';

export default function TripDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const toast = useToast();
  const { data: trip, error, loading, reload, refresh, refreshing } = useApi(() => tripApi.get(id), [id], { cacheKey: `trip:${id}` });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading full />;
  if (error) return <Screen title={t("Trip")}><ErrorView message={error} onRetry={reload} /></Screen>;

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      if (msg) toast(msg, 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  const active = ['scheduled', 'ongoing'].includes(trip.status);
  const pending = trip.bookings.filter((b) => b.status === 'pending');
  const confirmed = trip.bookings.filter((b) => b.status === 'accepted' || b.status === 'completed');
  const others = trip.bookings.filter((b) => !['pending', 'accepted', 'completed'].includes(b.status));
  const confirmStart = async () => (await confirm(t("Start this trip?"), t(
    "Passengers with confirmed seats will be notified. Unanswered requests will close."
  ), { okText: 'Start trip', cancelText: 'Not yet' })) && run('start', () => tripApi.start(trip.id), 'Trip started. Have a safe journey!');
  const confirmComplete = async () => (await confirm(t("Mark trip as completed?"), t("Confirmed bookings will be counted in your earnings."), { okText: 'Complete' })) && run('complete', () => tripApi.complete(trip.id), 'Trip completed');

  return (
    <Screen title={trip.tripType === 'return' ? t("Return trip") : t("Trip")} refreshing={refreshing} onRefresh={refresh} right={trip.status === 'scheduled' && <Button small variant="ghost" title={t("Edit")} icon="create-outline" onPress={() => navigation.navigate('TripForm', { trip: trip })} />}>
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Badge status={trip.status} />
          <Text style={font.sub}>{dateTimeLabel(trip.departureAt)}</Text>
        </Row>
        {trip.stops.map((s, i) => (
          <Row key={s.seq} style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <Ionicons name={i === 0 ? 'radio-button-on' : i === trip.stops.length - 1 ? 'location' : 'ellipse'} size={i === 0 || i === trip.stops.length - 1 ? 16 : 10} color={colors.primary} style={{ marginTop: 3 }} />
              {i < trip.stops.length - 1 && <View style={{ width: 2, height: 22, backgroundColor: colors.primaryBorder }} />}
            </View>
            <Text style={[i === 0 || i === trip.stops.length - 1 ? font.h3 : font.body, { flex: 1 }]}>{s.placeName}</Text>
            {i > 0 && s.fareFromStart != null && <Text style={font.small}>{rupees(s.fareFromStart)}</Text>}
          </Row>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
        <KV label={t("Vehicle")} value={`${trip.vehicle.make} ${trip.vehicle.model} · ${trip.vehicle.registrationNumber}`} />
        <KV label={t("Seats booked")} value={`${trip.bookedSeats} of ${trip.totalSeats}`} />
        <KV label={t("Price per seat")} value={rupees(trip.pricePerSeat)} />
        <KV label={t("Estimated earnings")} value={rupees(confirmed.reduce((a, b) => a + b.fareEstimate, 0))} />
        {trip.notes ? <KV label={t("Notes")} value={trip.notes} /> : null}
        {trip.cancelReason ? <KV label={t("Cancelled")} value={trip.cancelReason} /> : null}
        <Button small variant="ghost" icon="map-outline" title={t("Open route in Google Maps")} onPress={() => Linking.openURL(trip.routeMapsUrl)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Card>

      {trip.status === 'scheduled' && (
        <ToggleRow title={t("Accepting booking requests")} sub={trip.bookingOpen ? t("Passengers can find and book this trip") : t("Hidden from search — existing bookings stay")} value={trip.bookingOpen} onChange={(v) => run('open', () => tripApi.bookingOpen(trip.id, v))} />
      )}
      {active && <LocationShareCard tripId={trip.id} compact />}

      {active && (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {trip.status === 'scheduled' && <Button title={t("Start trip")} icon="play" variant="success" loading={busy === 'start'} onPress={confirmStart} />}
          <Button title={t("Mark as completed")} icon="checkmark-done" variant={trip.status === 'ongoing' ? 'success' : 'secondary'} loading={busy === 'complete'} onPress={confirmComplete} />
          {trip.tripType === 'start' && trip.status === 'scheduled' && <Button title={t("Create return trip")} icon="swap-horizontal" variant="secondary" onPress={() => navigation.navigate('TripForm', { returnOf: trip })} />}
          <Button title={t("Cancel trip")} icon="close-circle" variant="danger" onPress={() => setCancelOpen(true)} />
        </View>
      )}
      {trip.returnTrips?.length > 0 && (
        <Section title={t("Return trips")} icon="swap-horizontal">
          {trip.returnTrips.map((r) => (
            <Button key={r.id} variant="secondary" small title={`${dateTimeLabel(r.departureAt)} · ${r.status}`} onPress={() => navigation.push('TripDetail', { id: r.id })} style={{ marginBottom: 8 }} />
          ))}
        </Section>
      )}

      <Section title={t("New requests ({0})", [pending.length])} icon="hourglass">
        {pending.length ? pending.map((b) => <BookingCard key={b.id} booking={b} showTrip={false} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />) : <Text style={font.sub}>{t("No new requests.")}</Text>}
      </Section>
      <Section title={t("Confirmed passengers ({0})", [confirmed.length])} icon="people">
        {confirmed.length ? confirmed.map((b) => <BookingCard key={b.id} booking={b} showTrip={false} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />) : <Text style={font.sub}>{t("No confirmed passengers yet.")}</Text>}
      </Section>
      {others.length > 0 && (
        <Section title={t("Declined / cancelled")} icon="close-circle">
          {others.map((b) => (
            <Card key={b.id} style={{ marginBottom: 8 }} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={font.body}>{b.passengerName}{" · "}{b.seats}{" "}{t("seat(s)")}</Text>
                <Badge status={b.status} />
              </Row>
            </Card>
          ))}
        </Section>
      )}
      <PromptModal
        visible={cancelOpen}
        title={t("Cancel this trip?")}
        message={t("All passengers will be notified that the trip is cancelled.")}
        placeholder={t("Reason")}
        presets={['Vehicle problem', 'Personal emergency', 'Bad weather / road closed']}
        danger
        confirmText={t("Cancel trip")}
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => run('cancel', () => tripApi.cancel(trip.id, reason), 'Trip cancelled')}
      />
    </Screen>
  );
}
