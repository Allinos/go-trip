import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, Row, Screen, Section } from '../../components/ui';
import { partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors, font } from '../../theme';
import { fullDate, rupees, titleCase } from '../../utils/format';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

/** Preview of the driver's public marketplace profile. */
export default function DriverProfileScreen({ navigation }) {
  const { user, onboarding } = useAuth();
  const { data: p, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.driverProfile(), [], { cacheKey: 'driverProfile' });
  if (loading) return <Loading full />;
  if (error) return <Screen title={t("Marketplace profile")}><ErrorView message={error} onRetry={reload} /></Screen>;
  return (
    <Screen title={t("Marketplace profile")} refreshing={refreshing} onRefresh={refresh} footer={<Button title={t("Edit profile")} icon="create" onPress={() => navigation.navigate('EditDriverProfile', { edit: true })} />}>
      <Card style={{ alignItems: 'center', marginBottom: 16 }}>
        {user?.photoUrl ? <CachedImage uri={user.photoUrl} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Ionicons name="person-circle" size={96} color={colors.primaryBorder} />}
        <Text style={[font.h2, { marginTop: 8 }]}>{user?.fullName}</Text>
        {p.headline ? <Text style={[font.sub, { textAlign: 'center' }]}>{p.headline}</Text> : null}
        <Row style={{ marginTop: 8 }} gap={6}>
          <Badge tone={p.isListed ? 'green' : 'gray'} text={p.isListed ? t("Live on marketplace") : t("Not listed")} />
          {onboarding?.verificationStatus === 'approved' && <Badge tone="blue" text={t("Verified")} />}
        </Row>
        <Row style={{ marginTop: 12 }} gap={24}>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.viewCount}</Text>
            <Text style={font.small}>{t("views")}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.callCount}</Text>
            <Text style={font.small}>{t("calls")}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.completeness}%</Text>
            <Text style={font.small}>{t("complete")}</Text>
          </View>
        </Row>
      </Card>
      {p.bio ? (
        <Section plain title={t("About")} icon="person">
          <Card>
            <Text style={font.body}>{p.bio}</Text>
          </Card>
        </Section>
      ) : null}
      <Section plain title={t("Details customers see")} icon="list">
        <Card>
          <KV label={t("Experience")} value={p.hasPriorExperience ? `${p.experienceYears} year(s)` : 'New driver'} />
          <KV label={t("Drives")} value={p.vehicleTypes.map(titleCase).join(', ')} />
          <KV label={t("Licence")} value={[p.licenseTypes.join(', '), p.licenseExpiry && `valid till ${fullDate(p.licenseExpiry)}`].filter(Boolean).join(' · ')} />
          <KV label={t("Work")} value={p.workTypes.map(titleCase).join(', ') || '—'} />
          <KV label={t("Availability")} value={titleCase(p.availability)} />
          <KV label={t("Expected pay")} value={p.expectedPayMin != null ? `${rupees(p.expectedPayMin)}–${rupees(p.expectedPayMax)} ${titleCase(p.payUnit)}` : '—'} />
          <KV label={t("Languages")} value={p.languages.join(', ')} />
          <KV label={t("Location")} value={[p.city, p.district].filter(Boolean).join(', ')} />
          <KV label={t("Also works in")} value={p.serviceAreas.join(', ') || '—'} />
        </Card>
      </Section>
      <Text style={[font.small, { textAlign: 'center' }]}>{t(
        "Your documents are never shown to customers — only that they are verified."
      )}</Text>
    </Screen>
  );
}
