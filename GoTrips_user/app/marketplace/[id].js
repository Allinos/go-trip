import { Image, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, ErrorView, Header, KV, Loading, Pill, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import useRequireLogin from '../../hooks/useRequireLogin';
import { marketplaceAPI } from '../../services/api';
import { contactPartner } from '../../utils/contact';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { fullDate, rupees, titleCase } from '../../utils/format';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

const DOC_LABEL = { driving_license: 'Driving licence', aadhaar: 'Aadhaar', pan: 'PAN', police_verification: 'Police verification' };

export default function DriverProfile() {
  const { id } = useLocalSearchParams();
  const requireLogin = useRequireLogin();
  const { data: d, error, errorStatus, loading, reload } = useFetch(() => marketplaceAPI.driver(id), [id], { cacheKey: `driver:${id}` });
  if (loading) return (<><Header title={t("Driver")} /><Loading /></>);
  if (error) return (<><Header title={t("Driver")} /><ErrorView message={error} status={errorStatus} onRetry={reload} /></>);
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Driver profile")} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 120 }}>
        <Card style={{ alignItems: 'center', marginBottom: SPACING.md }}>
          {d.photoUrl ? <CachedImage uri={d.photoUrl} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: COLORS.primary, fontSize: 36, fontWeight: '700' }}>{(d.name || 'D')[0]}</Text></View>}
          <Row gap={6} style={{ marginTop: 10 }}>
            <Text style={TYPOGRAPHY.h3}>{d.name}</Text>
            {d.isVerified && <MaterialIcons name="verified" size={22} color={COLORS.success} />}
          </Row>
          {d.headline ? <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, textAlign: 'center' }]}>{d.headline}</Text> : null}
          <Row style={{ marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Pill text={d.hasPriorExperience ? t("{0} years experience", [d.experienceYears]) : t("New driver")} icon="work" />
            {d.isAvailable ? <Pill text={t("Available")} color={COLORS.success} bg="#ECFDF5" /> : <Pill text={t("Busy")} color={COLORS.text.secondary} bg={COLORS.divider} />}
            {d.age ? <Pill text={t("{0} yrs", [d.age])} color={COLORS.text.secondary} bg={COLORS.divider} /> : null}
          </Row>
        </Card>
        {d.bio ? (
          <Card style={{ marginBottom: SPACING.md }}>
            <Text style={TYPOGRAPHY.bodyBold}>{t("About")}</Text>
            <Text style={[TYPOGRAPHY.body, { color: COLORS.text.secondary, marginTop: 4 }]}>{d.bio}</Text>
          </Card>
        ) : null}
        <Card style={{ marginBottom: SPACING.md }}>
          <KV label={t("Can drive")} value={d.vehicleTypes.map(titleCase).join(', ')} />
          <KV label={t("Licence")} value={[d.licenseTypes.join(', '), d.licenseValid === false ? 'expired' : d.licenseValid ? 'valid' : null].filter(Boolean).join(' · ')} />
          <KV label={t("Automatic cars")} value={d.canDriveAutomatic ? 'Yes' : 'No'} />
          <KV label={t("Work")} value={d.workTypes.map(titleCase).join(', ') || '—'} />
          <KV label={t("Availability")} value={titleCase(d.availability)} />
          {d.expectedPay && <KV label={t("Expected pay")} value={`${rupees(d.expectedPay.min)}${d.expectedPay.max !== d.expectedPay.min ? `–${rupees(d.expectedPay.max)}` : ''} ${titleCase(d.expectedPay.unit)}`} />}
          <KV label={t("Languages")} value={d.languages.join(', ')} />
          <KV label={t("Based in")} value={[d.city, d.district].filter(Boolean).join(', ')} />
          {d.serviceAreas?.length ? <KV label={t("Also works in")} value={d.serviceAreas.join(', ')} /> : null}
          {d.experienceDetails ? <KV label={t("Experience")} value={d.experienceDetails} /> : null}
          {d.education ? <KV label={t("Education")} value={d.education} /> : null}
          <KV label={t("Own vehicle")} value={d.hasOwnVehicle ? 'Yes' : 'No'} />
          <KV label={t("On GoTrip since")} value={fullDate(d.memberSince)} />
        </Card>
        <Card>
          <Text style={TYPOGRAPHY.bodyBold}>{t("Verification")}</Text>
          {d.verifiedDocuments.length ? (
            d.verifiedDocuments.map((x) => (
              <Row key={x} style={{ marginTop: 6 }}>
                <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
                <Text style={TYPOGRAPHY.caption}>{DOC_LABEL[x] || titleCase(x)}{" "}{t("verified by GoTrip")}</Text>
              </Row>
            ))
          ) : (
            <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 4 }]}>{t("Documents are being verified.")}</Text>
          )}
        </Card>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: SPACING.md, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} icon="call" title={t("Call driver")} onPress={() => requireLogin(() => contactPartner('driver_profile', d.id), 'to call the driver')} />
        <Button style={{ flex: 1 }} variant="outline" icon="chat" title={t("WhatsApp")} onPress={() => requireLogin(() => contactPartner('driver_profile', d.id, 'whatsapp'), 'to message the driver')} />
      </View>
    </View>
  );
}
