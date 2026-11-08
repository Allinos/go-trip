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

export default function TripDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const toast = useToast();
  const { data: t, error, loading, reload, refresh, refreshing } = useApi(() => tripApi.get(id), [id]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading full />;
  if (error) return <Screen title="Trip"><ErrorView message={error} onRetry={reload} /></Screen>;

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
  const active = ['scheduled', 'ongoing'].includes(t.status);
  const pending = t.bookings.filter((b) => b.status === 'pending');
  const confirmed = t.bookings.filter((b) => b.status === 'accepted' || b.status === 'completed');
  const others = t.bookings.filter((b) => !['pending', 'accepted', 'completed'].includes(b.status));
  const confirmStart = async () => (await confirm('Start this trip?', 'Passengers with confirmed seats will be notified. Unanswered requests will close.', { okText: 'Start trip', cancelText: 'Not yet' })) && run('start', () => tripApi.start(t.id), 'Trip started. Have a safe journey!');
  const confirmComplete = async () => (await confirm('Mark trip as completed?', 'Confirmed bookings will be counted in your earnings.', { okText: 'Complete' })) && run('complete', () => tripApi.complete(t.id), 'Trip completed');

  return (
    <Screen title={t.tripType === 'return' ? 'Return trip' : 'Trip'} refreshing={refreshing} onRefresh={refresh} right={t.status === 'scheduled' && <Button small variant="ghost" title="Edit" icon="create-outline" onPress={() => navigation.navigate('TripForm', { trip: t })} />}>
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Badge status={t.status} />
          <Text style={font.sub}>{dateTimeLabel(t.departureAt)}</Text>
        </Row>
        {t.stops.map((s, i) => (
          <Row key={s.seq} style={{ alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 18 }}>
              <Ionicons name={i === 0 ? 'radio-button-on' : i === t.stops.length - 1 ? 'location' : 'ellipse'} size={i === 0 || i === t.stops.length - 1 ? 16 : 10} color={colors.primary} style={{ marginTop: 3 }} />
              {i < t.stops.length - 1 && <View style={{ width: 2, height: 22, backgroundColor: colors.primaryBorder }} />}
            </View>
            <Text style={[i === 0 || i === t.stops.length - 1 ? font.h3 : font.body, { flex: 1 }]}>{s.placeName}</Text>
            {i > 0 && s.fareFromStart != null && <Text style={font.small}>{rupees(s.fareFromStart)}</Text>}
          </Row>
        ))}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
        <KV label="Vehicle" value={`${t.vehicle.make} ${t.vehicle.model} · ${t.vehicle.registrationNumber}`} />
        <KV label="Seats booked" value={`${t.bookedSeats} of ${t.totalSeats}`} />
        <KV label="Price per seat" value={rupees(t.pricePerSeat)} />
        <KV label="Estimated earnings" value={rupees(confirmed.reduce((a, b) => a + b.fareEstimate, 0))} />
        {t.notes ? <KV label="Notes" value={t.notes} /> : null}
        {t.cancelReason ? <KV label="Cancelled" value={t.cancelReason} /> : null}
        <Button small variant="ghost" icon="map-outline" title="Open route in Google Maps" onPress={() => Linking.openURL(t.routeMapsUrl)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Card>

      {t.status === 'scheduled' && (
        <ToggleRow title="Accepting booking requests" sub={t.bookingOpen ? 'Passengers can find and book this trip' : 'Hidden from search — existing bookings stay'} value={t.bookingOpen} onChange={(v) => run('open', () => tripApi.bookingOpen(t.id, v))} />
      )}
      {active && <LocationShareCard tripId={t.id} compact />}

      {active && (
        <View style={{ gap: 10, marginBottom: 20 }}>
          {t.status === 'scheduled' && <Button title="Start trip" icon="play" variant="success" loading={busy === 'start'} onPress={confirmStart} />}
          <Button title="Mark as completed" icon="checkmark-done" variant={t.status === 'ongoing' ? 'success' : 'secondary'} loading={busy === 'complete'} onPress={confirmComplete} />
          {t.tripType === 'start' && t.status === 'scheduled' && <Button title="Create return trip" icon="swap-horizontal" variant="secondary" onPress={() => navigation.navigate('TripForm', { returnOf: t })} />}
          <Button title="Cancel trip" icon="close-circle" variant="danger" onPress={() => setCancelOpen(true)} />
        </View>
      )}
      {t.returnTrips?.length > 0 && (
        <Section title="Return trips" icon="swap-horizontal">
          {t.returnTrips.map((r) => (
            <Button key={r.id} variant="secondary" small title={`${dateTimeLabel(r.departureAt)} · ${r.status}`} onPress={() => navigation.push('TripDetail', { id: r.id })} style={{ marginBottom: 8 }} />
          ))}
        </Section>
      )}

      <Section title={`New requests (${pending.length})`} icon="hourglass">
        {pending.length ? pending.map((b) => <BookingCard key={b.id} booking={b} showTrip={false} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />) : <Text style={font.sub}>No new requests.</Text>}
      </Section>
      <Section title={`Confirmed passengers (${confirmed.length})`} icon="people">
        {confirmed.length ? confirmed.map((b) => <BookingCard key={b.id} booking={b} showTrip={false} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />) : <Text style={font.sub}>No confirmed passengers yet.</Text>}
      </Section>
      {others.length > 0 && (
        <Section title="Declined / cancelled" icon="close-circle">
          {others.map((b) => (
            <Card key={b.id} style={{ marginBottom: 8 }} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={font.body}>{b.passengerName} · {b.seats} seat(s)</Text>
                <Badge status={b.status} />
              </Row>
            </Card>
          ))}
        </Section>
      )}
      <PromptModal
        visible={cancelOpen}
        title="Cancel this trip?"
        message="All passengers will be notified that the trip is cancelled."
        placeholder="Reason"
        presets={['Vehicle problem', 'Personal emergency', 'Bad weather / road closed']}
        danger
        confirmText="Cancel trip"
        onClose={() => setCancelOpen(false)}
        onConfirm={(reason) => run('cancel', () => tripApi.cancel(t.id, reason), 'Trip cancelled')}
      />
    </Screen>
  );
}
