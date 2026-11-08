import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chips, Row } from './ui';
import { useLocationShare } from '../context/LocationContext';
import { useToast } from '../context/ToastContext';
import { colors, font } from '../theme';
import { ago, timeLabel } from '../utils/format';

/** Start/stop sharing live location. Optional tripId ties the share to a trip. */
export default function LocationShareCard({ tripId, compact }) {
  const { isSharing, share, start, stop, error } = useLocationShare();
  const [hours, setHours] = useState(4);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const toggle = async () => {
    setBusy(true);
    try {
      if (isSharing) {
        await stop();
        toast('Location sharing stopped');
      } else {
        await start({ hours, tripId });
        toast('Sharing your live location', 'success');
      }
    } catch (e) {
      toast(e.message || 'Could not share location', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ marginBottom: 16, borderColor: isSharing ? '#A7F3D0' : '#F1F1F1' }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ backgroundColor: isSharing ? colors.greenSoft : colors.primarySoft, borderRadius: 12, padding: 10 }}>
          <Ionicons name={isSharing ? 'navigate' : 'navigate-outline'} size={22} color={isSharing ? colors.green : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{isSharing ? 'Sharing live location' : 'Share live location'}</Text>
          <Text style={font.small}>
            {isSharing
              ? `Passengers with confirmed bookings can see you on Google Maps. Updated ${share?.updatedAt ? ago(share.updatedAt) : 'just now'} · stops at ${timeLabel(share?.expiresAt)}`
              : 'Let your confirmed passengers see where you are. Keep GoTrip open while driving.'}
          </Text>
        </View>
      </Row>
      {!isSharing && !compact && <Chips options={[1, 2, 4, 8].map((h) => ({ value: h, label: `${h} hour${h > 1 ? 's' : ''}` }))} value={hours} onChange={setHours} />}
      {error && !isSharing ? <Text style={{ color: colors.primaryDark, marginBottom: 8 }}>{error}</Text> : null}
      <Row>
        <Button style={{ flex: 1 }} small title={isSharing ? 'Stop sharing' : 'Start sharing'} variant={isSharing ? 'danger' : 'success'} icon={isSharing ? 'stop-circle' : 'play-circle'} onPress={toggle} loading={busy} />
        {isSharing && share?.lat != null && <Button small variant="secondary" title="View" icon="map" onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${share.lat},${share.lng}`)} />}
      </Row>
    </Card>
  );
}
