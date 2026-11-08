import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, ErrorView, Header, Input, KV, Loading, Notice, Row, StatusBadge } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { bookingAPI, errorMessage } from '../../services/api';
import { contactPartner } from '../../utils/contact';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { ago, dateLabel, rupees, timeLabel } from '../../utils/format';

export default function BookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: b, error, loading, reload, refresh } = useFetch(() => bookingAPI.get(id), [id]);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return (<><Header title="Booking" /><Loading /></>);
  if (error) return (<><Header title="Booking" /><ErrorView message={error} onRetry={reload} /></>);

  const t = b.trip;
  const loc = b.liveLocation;
  const cancel = async () => {
    setBusy(true);
    try {
      await bookingAPI.cancel(b.id, reason.trim() || undefined);
      setCancelling(false);
      reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={`Booking #${b.code}`} right={<MaterialIcons name="refresh" size={24} color={COLORS.primary} onPress={refresh} />} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        <Card style={{ marginBottom: SPACING.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <StatusBadge status={b.status} />
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>Requested {ago(b.createdAt)}</Text>
          </Row>
          {b.status === 'pending' && <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.text.secondary }]}>The driver has been notified. You will get a notification when they accept or decline.</Text>}
          {b.status === 'accepted' && <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.success }]}>Your seats are confirmed. Be at your pickup point on time.</Text>}
          {b.statusReason && ['rejected', 'cancelled', 'expired'].includes(b.status) ? <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.text.secondary }]}>Reason: {b.statusReason}</Text> : null}
          <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 10 }} />
          <KV label="Pickup" value={b.pickupName} />
          <KV label="Drop" value={b.dropName} />
          <KV label="Departure" value={`${dateLabel(t.departureAt)}, ${timeLabel(t.departureAt)}`} />
          <KV label="Seats" value={b.seats} />
          <KV label="Fare (pay driver)" value={rupees(b.fareEstimate)} />
        </Card>

        {b.status === 'accepted' && (
          <Card style={{ marginBottom: SPACING.md, borderColor: loc ? '#A7F3D0' : COLORS.border }}>
            <Row>
              <MaterialIcons name={loc ? 'my-location' : 'location-disabled'} size={22} color={loc ? COLORS.success : COLORS.text.tertiary} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.bodyBold}>{loc ? 'Driver is sharing live location' : 'Live location not shared yet'}</Text>
                <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{loc ? `Updated ${ago(loc.updatedAt)}${loc.stale ? ' (may be outdated)' : ''}` : 'The driver can share it close to departure. Pull down to refresh.'}</Text>
              </View>
            </Row>
            {loc && <Button title="Open in Google Maps" icon="map" onPress={() => Linking.openURL(loc.mapsUrl)} style={{ marginTop: 10 }} />}
          </Card>
        )}

        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={TYPOGRAPHY.bodyBold}>
            {t.driver.name} {t.driver.isVerified ? '✓' : ''}
          </Text>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>
            {t.vehicle.make} {t.vehicle.model} · {t.vehicle.color || ''} · {t.vehicle.registrationNumber}
          </Text>
          <Row style={{ marginTop: 10 }}>
            <Button style={{ flex: 1 }} small icon="call" title="Call driver" onPress={() => contactPartner('trip', t.id)} />
            <Button style={{ flex: 1 }} small variant="outline" icon="chat" title="WhatsApp" onPress={() => contactPartner('trip', t.id, 'whatsapp')} />
          </Row>
          <Button small variant="ghost" icon="map" title="Route on Google Maps" onPress={() => Linking.openURL(t.routeMapsUrl)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: 4 }} />
        </Card>

        {['pending', 'accepted'].includes(b.status) &&
          (cancelling ? (
            <Card>
              <Input label="Why are you cancelling? (optional)" value={reason} onChangeText={setReason} placeholder="e.g. Plans changed" />
              <Row>
                <Button style={{ flex: 1 }} small variant="outline" title="Keep booking" onPress={() => setCancelling(false)} />
                <Button style={{ flex: 1 }} small title="Cancel booking" loading={busy} onPress={cancel} />
              </Row>
            </Card>
          ) : (
            <Button variant="outline" icon="close" title="Cancel booking" onPress={() => setCancelling(true)} />
          ))}
        {['rejected', 'cancelled', 'expired'].includes(b.status) && <Button title="Find another trip" icon="search" onPress={() => router.replace({ pathname: '/search/results', params: { from: b.pickupName, to: b.dropName, seats: b.seats } })} />}
        <Notice text="Always confirm the vehicle number before boarding. For help, go to Account → Help & support." />
      </ScrollView>
    </View>
  );
}
