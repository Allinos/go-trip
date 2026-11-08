import React from 'react';
import { Alert, Image, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Badge, Header, MenuItem, Row } from '../../components/ui';
import { meApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth, useCaps, useCatalog } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, font, space } from '../../theme';
import { fullDate } from '../../utils/format';

const Group = ({ title, children }) => (
  <View style={{ marginBottom: space.lg }}>
    {title && <Text style={[font.label, { paddingHorizontal: space.lg, marginBottom: 6 }]}>{title}</Text>}
    <View style={{ backgroundColor: colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border }}>{children}</View>
  </View>
);

export default function AccountScreen({ navigation }) {
  const { user, onboarding, logout } = useAuth();
  const caps = useCaps();
  const { config } = useCatalog();
  const toast = useToast();
  const goodsOn = caps.goods && config?.features?.goodsOrders;

  const confirmLogout = () => Alert.alert('Log out?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => logout() }]);
  const deleteAccount = () =>
    Alert.alert('Delete your account?', 'Your listings, vehicles and trips will be removed and you will be logged out. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await meApi.remove();
            logout('Your account has been deleted.');
          } catch (e) {
            toast(errorMessage(e), 'error');
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title="Account" back={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Row style={{ paddingHorizontal: space.lg, marginBottom: space.lg }} gap={14}>
          {user?.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} />
          ) : (
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: 24, fontWeight: '700' }}>{(user?.fullName || 'P')[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={font.h2}>{user?.fullName}</Text>
            <Text style={font.sub}>{user?.phone}</Text>
            <Row gap={6}>
              <Badge tone="blue" text={onboarding?.category?.name} />
              <Badge status={onboarding?.verificationStatus} text={onboarding?.verificationStatus === 'pending' ? 'In review' : undefined} />
            </Row>
          </View>
        </Row>

        <Group title="Business">
          {caps.driver && <MenuItem icon="person-circle" title="Marketplace profile" sub="What customers see" onPress={() => navigation.navigate('DriverProfile')} />}
          <MenuItem icon="stats-chart" title="Earnings & history" sub="Estimated from your bookings" onPress={() => navigation.navigate('Earnings')} />
          {caps.trips && <MenuItem icon="navigate" title="Share live location" onPress={() => navigation.navigate('LocationShare')} />}
          {goodsOn && <MenuItem icon="cube" title="Goods transport orders" onPress={() => navigation.navigate('GoodsOrders')} />}
          <MenuItem icon="document-text" title="My documents" onPress={() => navigation.navigate('Documents', { edit: true })} />
          {onboarding?.category?.registrationFee > 0 && <MenuItem icon="card" title="Payments & listing" sub={onboarding?.listing?.expiresAt ? `Valid till ${fullDate(onboarding.listing.expiresAt)}` : undefined} onPress={() => navigation.navigate('Payments')} />}
        </Group>

        <Group title="Profile">
          <MenuItem icon="create" title="Edit profile" sub="Name, email, photo" onPress={() => navigation.navigate('EditProfile')} />
          <MenuItem icon="business" title="Business & contact details" onPress={() => navigation.navigate('BusinessDetails', { edit: true })} />
          <MenuItem icon="notifications" title="Notifications" onPress={() => navigation.navigate('Notifications')} />
        </Group>

        <Group title="Help">
          <MenuItem icon="help-buoy" title="Help & support" sub="FAQs and support tickets" onPress={() => navigation.navigate('Support')} />
          {config?.supportPhone && <MenuItem icon="call" title="Call support" sub={config.supportPhone} onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} />}
        </Group>

        <Group>
          <MenuItem icon="log-out" title="Log out" danger onPress={confirmLogout} right={null} />
          <MenuItem icon="trash" title="Delete account" danger onPress={deleteAccount} right={null} />
        </Group>
        <Text style={[font.small, { textAlign: 'center' }]}>GoTrip Partner v{Constants.expoConfig?.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
