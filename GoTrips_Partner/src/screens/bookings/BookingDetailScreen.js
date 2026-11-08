import React, { useState } from 'react';
import { Linking, Text } from 'react-native';
import { Badge, Button, Card, ErrorView, KV, Loading, PromptModal, Row, Screen } from '../../components/ui';
import { bookingApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { font } from '../../theme';
import { dateTimeLabel, rupees } from '../../utils/format';
import { t } from '../../i18n';
import { Stars } from '../account/ReviewsScreen';

export default function BookingDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const toast = useToast();
  const { data: b, error, loading, reload } = useApi(() => bookingApi.get(id), [id], { cacheKey: `booking:${id}` });
  const [prompt, setPrompt] = useState(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading full />;
  if (error) return <Screen title={t("Booking")}><ErrorView message={error} onRetry={reload} /></Screen>;

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
    <Screen title={t("Booking {0}", [b.code])}>
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={font.h2}>{b.passengerName || t("Passenger")}</Text>
          <Badge status={b.status} />
        </Row>
        <KV label={t("Phone")} value={b.passengerPhone} />
        <KV label={t("Seats")} value={b.seats} />
        <KV label={t("Pickup")} value={b.pickupName} />
        <KV label={t("Drop")} value={b.dropName} />
        <KV label={t("Fare (estimated)")} value={rupees(b.fareEstimate)} />
        <KV label={t("Requested")} value={dateTimeLabel(b.createdAt)} />
        {b.note ? <KV label={t("Message")} value={b.note} /> : null}
        {b.statusReason ? <KV label={t("Reason")} value={b.statusReason} /> : null}
      </Card>
      {b.review && (
        <Card style={{ marginBottom: 16 }}>
          <Text style={[font.h3, { marginBottom: 6 }]}>{t("Passenger's rating")}</Text>
          <Stars value={b.review.rating} size={18} />
          {b.review.comment ? <Text style={[font.body, { marginTop: 6 }]}>“{b.review.comment}”</Text> : null}
        </Card>
      )}
      <Card style={{ marginBottom: 16 }} onPress={() => navigation.navigate('TripDetail', { id: b.trip.id })}>
        <Text style={font.small}>{t("TRIP")}</Text>
        <Text style={font.h3}>
          {b.trip.originName}{" → "}{b.trip.destinationName}
        </Text>
        <Text style={font.sub}>
          {dateTimeLabel(b.trip.departureAt)}{" · "}{b.trip.availableSeats}{" "}{t("seat(s) left")}</Text>
      </Card>
      <Row style={{ marginBottom: 12 }}>
        <Button style={{ flex: 1 }} icon="call" title={t("Call")} onPress={() => Linking.openURL(`tel:${b.passengerPhone}`)} />
        <Button style={{ flex: 1 }} icon="logo-whatsapp" title={t("WhatsApp")} variant="secondary" onPress={() => Linking.openURL(wa)} />
      </Row>
      {b.status === 'pending' && (
        <Row>
          <Button style={{ flex: 1 }} variant="success" icon="checkmark" title={t("Accept")} loading={busy} onPress={() => run(() => bookingApi.accept(b.id), 'Booking confirmed. Passenger notified.')} />
          <Button style={{ flex: 1 }} variant="danger" icon="close" title={t("Decline")} onPress={() => setPrompt('reject')} />
        </Row>
      )}
      {b.status === 'accepted' && <Button variant="danger" icon="close-circle" title={t("Cancel this booking")} onPress={() => setPrompt('cancel')} />}
      <PromptModal
        visible={!!prompt}
        title={prompt === 'cancel' ? t("Cancel confirmed booking?") : t("Decline this request?")}
        message={t("The passenger will be notified.")}
        placeholder={t("Reason")}
        presets={prompt === 'cancel' ? ['Vehicle problem', 'Trip changed'] : ['Seats are full', 'Not going that way']}
        required={prompt === 'cancel'}
        danger
        confirmText={prompt === 'cancel' ? t("Cancel booking") : t("Decline")}
        onClose={() => setPrompt(null)}
        onConfirm={(reason) => (prompt === 'cancel' ? run(() => bookingApi.cancel(b.id, reason), 'Booking cancelled') : run(() => bookingApi.reject(b.id, reason || undefined), 'Request declined'))}
      />
    </Screen>
  );
}
