import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, PromptModal, Row } from './ui';
import { bookingApi } from '../api';
import { errorMessage } from '../api/client';
import { useToast } from '../context/ToastContext';
import { colors, font } from '../theme';
import { ago, dateTimeLabel, rupees } from '../utils/format';

/** Booking request card with Accept / Decline / Call actions. */
export default function BookingCard({ booking: b, onChanged, onPress, showTrip = true }) {
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const act = async (kind, fn) => {
    setBusy(kind);
    try {
      await fn();
      toast(kind === 'accept' ? 'Booking confirmed. Passenger notified.' : 'Request declined', kind === 'accept' ? 'success' : 'info');
      onChanged?.();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={font.h3}>{b.passengerName || 'Passenger'}</Text>
        <Badge status={b.status} />
      </Row>
      <Row style={{ marginTop: 6 }}>
        <Ionicons name="people" size={16} color={colors.sub} />
        <Text style={font.body}>
          {b.seats} seat{b.seats > 1 ? 's' : ''} · {b.pickupName} → {b.dropName}
        </Text>
      </Row>
      {showTrip && b.trip && (
        <Row style={{ marginTop: 4 }}>
          <Ionicons name="time-outline" size={16} color={colors.sub} />
          <Text style={font.sub}>{dateTimeLabel(b.trip.departureAt)}</Text>
        </Row>
      )}
      <Row style={{ marginTop: 4, justifyContent: 'space-between' }}>
        <Text style={[font.body, { fontWeight: '700' }]}>{rupees(b.fareEstimate)} <Text style={font.small}>estimated</Text></Text>
        <Text style={font.small}>{ago(b.createdAt)}</Text>
      </Row>
      {b.note ? <Text style={[font.sub, { marginTop: 6, fontStyle: 'italic' }]}>“{b.note}”</Text> : null}
      <Row style={{ marginTop: 12 }}>
        {b.status === 'pending' && (
          <>
            <Button style={{ flex: 1 }} small variant="success" icon="checkmark" title="Accept" loading={busy === 'accept'} onPress={() => act('accept', () => bookingApi.accept(b.id))} />
            <Button style={{ flex: 1 }} small variant="danger" icon="close" title="Decline" onPress={() => setRejecting(true)} />
          </>
        )}
        <Button small variant="secondary" icon="call" title="Call" onPress={() => Linking.openURL(`tel:${b.passengerPhone}`)} style={b.status !== 'pending' ? { flex: 1 } : undefined} />
      </Row>
      <PromptModal
        visible={rejecting}
        title="Decline this request?"
        message="The passenger will be told. A reason helps them."
        placeholder="Reason (optional)"
        presets={['Seats are full', 'Not going that way', 'Trip time changed']}
        required={false}
        danger
        confirmText="Decline"
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
