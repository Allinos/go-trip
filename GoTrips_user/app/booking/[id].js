import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, ErrorView, Header, Input, KV, Loading, Notice, Row, StatusBadge } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { bookingAPI, errorMessage } from '../../services/api';
import { contactPartner } from '../../utils/contact';
import { StarInput, Stars } from '../../components/Stars';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { ago, dateLabel, rupees, timeLabel } from '../../utils/format';
import { t } from '../../i18n';

export default function BookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: b, error, errorStatus, loading, reload, refresh } = useFetch(() => bookingAPI.get(id), [id], { cacheKey: `booking:${id}` });
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [editingReview, setEditingReview] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) return (<><Header title={t("Booking")} /><Loading /></>);
  if (error) return (<><Header title={t("Booking")} /><ErrorView message={error} status={errorStatus} onRetry={reload} /></>);

  const trip = b.trip;
  const loc = b.liveLocation;
  const cancel = async () => {
    setBusy(true);
    try {
      await bookingAPI.cancel(b.id, reason.trim() || undefined);
      setCancelling(false);
      reload();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await bookingAPI.review(b.id, { rating: stars, comment: comment.trim() || undefined });
      setEditingReview(false);
      reload();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const startEdit = () => {
    setStars(b.review?.rating || 0);
    setComment(b.review?.comment || '');
    setEditingReview(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Booking #{0}", [b.code])} right={<MaterialIcons name="refresh" size={24} color={COLORS.primary} onPress={refresh} />} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        <Card style={{ marginBottom: SPACING.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <StatusBadge status={b.status} />
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{t("Requested")}{" "}{ago(b.createdAt)}</Text>
          </Row>
          {b.status === 'pending' && <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.text.secondary }]}>{t(
            "The driver has been notified. You will get a notification when they accept or decline."
          )}</Text>}
          {b.status === 'accepted' && <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.success }]}>{t("Your seats are confirmed. Be at your pickup point on time.")}</Text>}
          {b.statusReason && ['rejected', 'cancelled', 'expired'].includes(b.status) ? <Text style={[TYPOGRAPHY.caption, { marginTop: 8, color: COLORS.text.secondary }]}>{t("Reason:")}{" "}{b.statusReason}</Text> : null}
          <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 10 }} />
          <KV label={t("Pickup")} value={b.pickupName} />
          <KV label={t("Drop")} value={b.dropName} />
          <KV label={t("Departure")} value={`${dateLabel(trip.departureAt)}, ${timeLabel(trip.departureAt)}`} />
          <KV label={t("Seats")} value={b.seats} />
          <KV label={t("Fare (pay driver)")} value={rupees(b.fareEstimate)} />
        </Card>

        {b.status === 'accepted' && (
          <Card style={{ marginBottom: SPACING.md, borderColor: loc ? '#A7F3D0' : COLORS.border }}>
            <Row>
              <MaterialIcons name={loc ? 'my-location' : 'location-disabled'} size={22} color={loc ? COLORS.success : COLORS.text.tertiary} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.bodyBold}>{loc ? t("Driver is sharing live location") : t("Live location not shared yet")}</Text>
                <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{loc ? t(
                  "Updated {0}{1}",
                  [ago(loc.updatedAt), loc.stale ? ' (may be outdated)' : '']
                ) : t("The driver can share it close to departure. Pull down to refresh.")}</Text>
              </View>
            </Row>
            {loc && <Button title={t("Open in Google Maps")} icon="map" onPress={() => Linking.openURL(loc.mapsUrl)} style={{ marginTop: 10 }} />}
          </Card>
        )}

        {b.canReview &&
          (b.review && !editingReview ? (
            <Card style={{ marginBottom: SPACING.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={TYPOGRAPHY.bodyBold}>{t("Your rating")}</Text>
                <Button small variant="ghost" icon="edit" title={t("Edit")} onPress={startEdit} />
              </Row>
              <Stars value={b.review.rating} size={20} />
              {b.review.comment ? <Text style={[TYPOGRAPHY.caption, { marginTop: 6, color: COLORS.text.secondary }]}>“{b.review.comment}”</Text> : null}
            </Card>
          ) : (
            <Card style={{ marginBottom: SPACING.md, borderColor: '#FDE68A' }}>
              <Text style={[TYPOGRAPHY.bodyBold, { textAlign: 'center', marginBottom: 8 }]}>{t("How was your trip?")}</Text>
              <StarInput value={stars} onChange={(v) => { setStars(v); if (!editingReview) setEditingReview(true); }} />
              {stars > 0 && (
                <>
                  <Input style={{ marginTop: 12 }} value={comment} onChangeText={setComment} placeholder={t("Tell other passengers about the driver (optional)")} maxLength={500} multiline />
                  <Button title={t("Submit rating")} loading={saving} onPress={submitReview} />
                </>
              )}
            </Card>
          ))}

        <Card style={{ marginBottom: SPACING.md }}>
          <Text style={TYPOGRAPHY.bodyBold}>
            {trip.driver.name} {trip.driver.isVerified ? '✓' : ''}
          </Text>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>
            {[`${trip.vehicle.make} ${trip.vehicle.model}`, trip.vehicle.color, trip.vehicle.registrationNumber].filter(Boolean).join(' · ')}
          </Text>
          <Row style={{ marginTop: 10 }}>
            <Button style={{ flex: 1 }} small icon="call" title={t("Call driver")} onPress={() => contactPartner('trip', trip.id)} />
            <Button style={{ flex: 1 }} small variant="outline" icon="chat" title={t("WhatsApp")} onPress={() => contactPartner('trip', trip.id, 'whatsapp')} />
          </Row>
          <Button small variant="ghost" icon="map" title={t("Route on Google Maps")} onPress={() => Linking.openURL(trip.routeMapsUrl)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, marginTop: 4 }} />
        </Card>

        {['pending', 'accepted'].includes(b.status) &&
          (cancelling ? (
            <Card>
              <Input label={t("Why are you cancelling? (optional)")} value={reason} onChangeText={setReason} placeholder={t("e.g. Plans changed")} />
              <Row>
                <Button style={{ flex: 1 }} small variant="outline" title={t("Keep booking")} onPress={() => setCancelling(false)} />
                <Button style={{ flex: 1 }} small title={t("Cancel booking")} loading={busy} onPress={cancel} />
              </Row>
            </Card>
          ) : (
            <Button variant="outline" icon="close" title={t("Cancel booking")} onPress={() => setCancelling(true)} />
          ))}
        {['rejected', 'cancelled', 'expired'].includes(b.status) && <Button title={t("Find another trip")} icon="search" onPress={() => router.replace({ pathname: '/search/results', params: { from: b.pickupName, to: b.dropName, seats: b.seats } })} />}
        <Notice text={t(
          "Always confirm the vehicle number before boarding. For help, go to Account → Help & support."
        )} />
      </ScrollView>
    </View>
  );
}
