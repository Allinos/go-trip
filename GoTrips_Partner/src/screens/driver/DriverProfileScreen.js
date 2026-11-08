import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, Row, Screen, Section } from '../../components/ui';
import { partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { colors, font } from '../../theme';
import { fullDate, rupees, titleCase } from '../../utils/format';

/** Preview of the driver's public marketplace profile. */
export default function DriverProfileScreen({ navigation }) {
  const { user, onboarding } = useAuth();
  const { data: p, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.driverProfile());
  if (loading) return <Loading full />;
  if (error) return <Screen title="Marketplace profile"><ErrorView message={error} onRetry={reload} /></Screen>;
  return (
    <Screen title="Marketplace profile" refreshing={refreshing} onRefresh={refresh} footer={<Button title="Edit profile" icon="create" onPress={() => navigation.navigate('EditDriverProfile', { edit: true })} />}>
      <Card style={{ alignItems: 'center', marginBottom: 16 }}>
        {user?.photoUrl ? <Image source={{ uri: user.photoUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} /> : <Ionicons name="person-circle" size={96} color={colors.primaryBorder} />}
        <Text style={[font.h2, { marginTop: 8 }]}>{user?.fullName}</Text>
        {p.headline ? <Text style={[font.sub, { textAlign: 'center' }]}>{p.headline}</Text> : null}
        <Row style={{ marginTop: 8 }} gap={6}>
          <Badge tone={p.isListed ? 'green' : 'gray'} text={p.isListed ? 'Live on marketplace' : 'Not listed'} />
          {onboarding?.verificationStatus === 'approved' && <Badge tone="blue" text="Verified" />}
        </Row>
        <Row style={{ marginTop: 12 }} gap={24}>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.viewCount}</Text>
            <Text style={font.small}>views</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.callCount}</Text>
            <Text style={font.small}>calls</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={font.h2}>{p.completeness}%</Text>
            <Text style={font.small}>complete</Text>
          </View>
        </Row>
      </Card>
      {p.bio ? (
        <Section title="About" icon="person">
          <Card>
            <Text style={font.body}>{p.bio}</Text>
          </Card>
        </Section>
      ) : null}
      <Section title="Details customers see" icon="list">
        <Card>
          <KV label="Experience" value={p.hasPriorExperience ? `${p.experienceYears} year(s)` : 'New driver'} />
          <KV label="Drives" value={p.vehicleTypes.map(titleCase).join(', ')} />
          <KV label="Licence" value={[p.licenseTypes.join(', '), p.licenseExpiry && `valid till ${fullDate(p.licenseExpiry)}`].filter(Boolean).join(' · ')} />
          <KV label="Work" value={p.workTypes.map(titleCase).join(', ') || '—'} />
          <KV label="Availability" value={titleCase(p.availability)} />
          <KV label="Expected pay" value={p.expectedPayMin != null ? `${rupees(p.expectedPayMin)}–${rupees(p.expectedPayMax)} ${titleCase(p.payUnit)}` : '—'} />
          <KV label="Languages" value={p.languages.join(', ')} />
          <KV label="Location" value={[p.city, p.district].filter(Boolean).join(', ')} />
          <KV label="Also works in" value={p.serviceAreas.join(', ') || '—'} />
        </Card>
      </Section>
      <Text style={[font.small, { textAlign: 'center' }]}>Your documents are never shown to customers — only that they are verified.</Text>
    </Screen>
  );
}
