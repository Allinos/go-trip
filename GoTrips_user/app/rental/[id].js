import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, ErrorView, Header, KV, Loading, Notice, Pill, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import useRequireLogin from '../../hooks/useRequireLogin';
import { rentalAPI } from '../../services/api';
import { contactPartner } from '../../utils/contact';
import { COLORS, SPACING, TYPOGRAPHY, VEHICLE_LABELS } from '../../constants';
import { rupees, titleCase } from '../../utils/format';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

export default function RentalDetail() {
  const { id } = useLocalSearchParams();
  const requireLogin = useRequireLogin();
  const { data: v, error, loading, reload } = useFetch(() => rentalAPI.get(id), [id], { cacheKey: `rental:${id}` });
  if (loading) return (<><Header title={t("Vehicle")} /><Loading /></>);
  if (error) return (<><Header title={t("Vehicle")} /><ErrorView message={error} onRetry={reload} /></>);
  const r = v.rental;
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={`${v.make} ${v.model}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {(v.photos.length ? v.photos : [null]).map((p, i) =>
            p ? <CachedImage key={p} uri={p} style={{ width: 400, height: 230 }} /> : <View key={i} style={{ width: 400, height: 160, backgroundColor: COLORS.divider, alignItems: 'center', justifyContent: 'center' }}><MaterialIcons name="directions-car" size={60} color={COLORS.text.tertiary} /></View>
          )}
        </ScrollView>
        <View style={{ padding: SPACING.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={TYPOGRAPHY.h3}>
              {v.make} {v.model}
            </Text>
            <Pill text={r.available ? t("Available") : t("Not available now")} color={r.available ? COLORS.success : COLORS.text.secondary} bg={r.available ? '#ECFDF5' : COLORS.divider} />
          </Row>
          <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>
            {VEHICLE_LABELS[v.vehicleClass]} {v.year ? `· ${v.year}` : ''} {v.color ? `· ${v.color}` : ''}
          </Text>
          <Row style={{ marginTop: 12, gap: 16 }}>
            {r.pricePerDay ? (
              <View>
                <Text style={[TYPOGRAPHY.h3, { color: COLORS.primary }]}>{rupees(r.pricePerDay)}</Text>
                <Text style={TYPOGRAPHY.small}>{t("per day")}</Text>
              </View>
            ) : null}
            {r.pricePerHour ? (
              <View>
                <Text style={[TYPOGRAPHY.h3, { color: COLORS.primary }]}>{rupees(r.pricePerHour)}</Text>
                <Text style={TYPOGRAPHY.small}>{t("per hour")}</Text>
              </View>
            ) : null}
          </Row>
          {!r.available && <Notice title={t("Currently not available")} text={t("You can still call the owner to ask when it will be free.")} color={COLORS.warning} bg="#FFFBEB" icon="schedule" />}
          <Card style={{ marginTop: SPACING.md }}>
            <KV label={t("Driver")} value={titleCase(r.driverOption)} />
            {v.seats ? <KV label={t("Seats")} value={v.seats} /> : null}
            <KV label={t("Fuel")} value={titleCase(v.fuelType)} />
            <KV label={t("AC")} value={v.hasAc ? 'Yes' : 'No'} />
            {r.securityDeposit ? <KV label={t("Security deposit")} value={rupees(r.securityDeposit)} /> : null}
            {r.minHours ? <KV label={t("Minimum rental")} value={`${r.minHours} hours`} /> : null}
            <KV label={t("Pickup area")} value={[r.address, r.city, r.district].filter(Boolean).join(', ')} />
            {v.features?.length ? <KV label={t("Extras")} value={v.features.join(', ')} /> : null}
          </Card>
          {v.description ? <Text style={[TYPOGRAPHY.body, { marginTop: SPACING.md }]}>{v.description}</Text> : null}
          {r.terms ? (
            <Card style={{ marginTop: SPACING.md }}>
              <Text style={TYPOGRAPHY.captionBold}>{t("Rental terms")}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 4 }]}>{r.terms}</Text>
            </Card>
          ) : null}
          {r.mapsUrl && <Button variant="ghost" icon="map" title={t("See pickup location on Google Maps")} onPress={() => Linking.openURL(r.mapsUrl)} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />}
          <Card style={{ marginTop: SPACING.md }}>
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{t("OWNER")}</Text>
            <Row gap={6}>
              <Text style={TYPOGRAPHY.bodyBold}>{v.owner.name}</Text>
              {v.owner.isVerified && <MaterialIcons name="verified" size={18} color={COLORS.success} />}
            </Row>
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{[v.owner.city, v.owner.district].filter(Boolean).join(', ')}</Text>
          </Card>
        </View>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} icon="call" title={t("Call owner")} onPress={() => requireLogin(() => contactPartner('vehicle', v.id), 'to call the owner')} />
        <Button style={{ flex: 1 }} variant="outline" icon="chat" title={t("WhatsApp")} onPress={() => requireLogin(() => contactPartner('vehicle', v.id, 'whatsapp'), 'to message the owner')} />
      </View>
    </View>
  );
}
