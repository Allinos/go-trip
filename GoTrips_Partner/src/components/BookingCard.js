import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, PromptModal, Row } from './ui';
import { bookingApi } from '../api';
import { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { colors, font } from '../theme';
import { ago, dateTimeLabel, loadText, rupees } from '../utils/format';
import { t } from '../i18n';

/** Booking request card with Accept / Decline / Call actions. */
export default function BookingCard({ booking: b, onChanged, onPress, showTrip = true }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const act = async (kind, fn) => {
    setBusy(kind);
    try {
      await fn();
      toast(kind === 'accept' ? goods ? t("Hire confirmed. Customer notified.") : t("Booking confirmed. Passenger notified.") : t("Request declined"), kind === 'accept' ? 'success' : 'info');
      onChanged?.();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  const goods = !!b.goodsType || b.kind === 'goods' || b.trip?.kind === 'goods';
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[font.h3, { flex: 1 }]} numberOfLines={1}>{b.passengerName || (goods ? t("Customer") : t("Passenger"))}</Text>
        <Badge status={b.status} />
      </Row>
      <Row style={{ marginTop: 6 }}>
        <Ionicons name={goods ? 'cube' : 'people'} size={16} color={colors.sub} />
        <Text style={[font.body, { flex: 1 }]}>
          {goods ? [b.goodsType, b.loadKg && loadText(b.loadKg)].filter(Boolean).join(' · ') : b.seats > 1 ? t("{0} seats", [b.seats]) : t("{0} seat", [b.seats])}
        </Text>
      </Row>
      <Row style={{ marginTop: 4 }}>
        <Ionicons name="navigate-outline" size={16} color={colors.sub} />
        <Text style={[font.sub, { flex: 1 }]}>{b.pickupName}{" → "}{b.dropName}</Text>
      </Row>
      {showTrip && b.trip && (
        <Row style={{ marginTop: 4 }}>
          <Ionicons name="time-outline" size={16} color={colors.sub} />
          <Text style={font.sub}>{dateTimeLabel(b.trip.departureAt)}</Text>
        </Row>
      )}
      <Row style={{ marginTop: 4, justifyContent: 'space-between' }}>
        <Text style={[font.body, { fontWeight: '700' }]}>{rupees(b.fareEstimate)} <Text style={font.small}>{t("estimated")}</Text></Text>
        <Text style={font.small}>{ago(b.createdAt)}</Text>
      </Row>
      {b.note ? <Text style={[font.sub, { marginTop: 6, fontStyle: 'italic' }]}>“{b.note}”</Text> : null}
      <Row style={{ marginTop: 12 }}>
        {b.status === 'pending' && (
          <>
            <Button style={{ flex: 1 }} small variant="success" icon="checkmark" title={t("Accept")} loading={busy === 'accept'} onPress={() => act('accept', () => bookingApi.accept(b.id))} />
            <Button style={{ flex: 1 }} small variant="danger" icon="close" title={t("Decline")} onPress={() => setRejecting(true)} />
          </>
        )}
        <Button small variant="secondary" icon="call" title={t("Call")} onPress={() => Linking.openURL(`tel:${b.passengerPhone}`)} style={b.status !== 'pending' ? { flex: 1 } : undefined} />
      </Row>
      <PromptModal
        visible={rejecting}
        title={t("Decline this request?")}
        message={t("The passenger will be told. A reason helps them.")}
        placeholder={t("Reason (optional)")}
        presets={['Seats are full', 'Not going that way', 'Trip time changed']}
        required={false}
        danger
        confirmText={t("Decline")}
        onClose={() => setRejecting(false)}
        onConfirm={(reason) => act('reject', () => bookingApi.reject(b.id, reason || undefined))}
      />
    </Card>
  );
}

export const StatusLine = ({ icon, children }) => (
  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
    <Ionicons name={icon} size={16} color={colors.sub} />
    <Text style={font.sub}>{children}</Text>
  </View>
);
