import React, { useState } from 'react';
import { Linking, Text } from 'react-native';
import { Badge, Button, Card, ErrorView, KV, Loading, PromptModal, Row, Screen } from '../../components/ui';
import { bookingApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { font } from '../../theme';
import { dateTimeLabel, rupees } from '../../utils/format';

export default function BookingDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const toast = useToast();
  const { data: b, error, loading, reload } = useApi(() => bookingApi.get(id), [id]);
  const [prompt, setPrompt] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading full />;
  if (error) return <Screen title="Booking"><ErrorView message={error} onRetry={reload} /></Screen>;

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast(msg, 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  const wa = `https://wa.me/${b.passengerPhone.replace(/\D/g, '')}`;
  return (
    <Screen title={`Booking ${b.code}`}>
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={font.h2}>{b.passengerName || 'Passenger'}</Text>
          <Badge status={b.status} />
        </Row>
        <KV label="Phone" value={b.passengerPhone} />
        <KV label="Seats" value={b.seats} />
        <KV label="Pickup" value={b.pickupName} />
        <KV label="Drop" value={b.dropName} />
        <KV label="Fare (estimated)" value={rupees(b.fareEstimate)} />
        <KV label="Requested" value={dateTimeLabel(b.createdAt)} />
        {b.note ? <KV label="Message" value={b.note} /> : null}
        {b.statusReason ? <KV label="Reason" value={b.statusReason} /> : null}
      </Card>
      <Card style={{ marginBottom: 16 }} onPress={() => navigation.navigate('TripDetail', { id: b.trip.id })}>
        <Text style={font.small}>TRIP</Text>
        <Text style={font.h3}>
          {b.trip.originName} → {b.trip.destinationName}
        </Text>
        <Text style={font.sub}>
          {dateTimeLabel(b.trip.departureAt)} · {b.trip.availableSeats} seat(s) left
        </Text>
      </Card>
      <Row style={{ marginBottom: 12 }}>
        <Button style={{ flex: 1 }} icon="call" title="Call" onPress={() => Linking.openURL(`tel:${b.passengerPhone}`)} />
        <Button style={{ flex: 1 }} icon="logo-whatsapp" title="WhatsApp" variant="secondary" onPress={() => Linking.openURL(wa)} />
      </Row>
      {b.status === 'pending' && (
        <Row>
          <Button style={{ flex: 1 }} variant="success" icon="checkmark" title="Accept" loading={busy} onPress={() => run(() => bookingApi.accept(b.id), 'Booking confirmed. Passenger notified.')} />
          <Button style={{ flex: 1 }} variant="danger" icon="close" title="Decline" onPress={() => setPrompt('reject')} />
        </Row>
      )}
      {b.status === 'accepted' && <Button variant="danger" icon="close-circle" title="Cancel this booking" onPress={() => setPrompt('cancel')} />}
      <PromptModal
        visible={!!prompt}
        title={prompt === 'cancel' ? 'Cancel confirmed booking?' : 'Decline this request?'}
        message="The passenger will be notified."
        placeholder="Reason"
        presets={prompt === 'cancel' ? ['Vehicle problem', 'Trip changed'] : ['Seats are full', 'Not going that way']}
        required={prompt === 'cancel'}
        danger
        confirmText={prompt === 'cancel' ? 'Cancel booking' : 'Decline'}
        onClose={() => setPrompt(null)}
        onConfirm={(reason) => (prompt === 'cancel' ? run(() => bookingApi.cancel(b.id, reason), 'Booking cancelled') : run(() => bookingApi.reject(b.id, reason || undefined), 'Request declined'))}
      />
    </Screen>
  );
}
