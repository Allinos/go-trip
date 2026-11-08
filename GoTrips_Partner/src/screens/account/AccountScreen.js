import React from 'react';
import { Image, Linking, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Badge, Header, MenuItem, Row } from '../../components/ui';
import { meApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth, useCaps, useCatalog } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { colors, font, space } from '../../theme';
import { fullDate } from '../../utils/format';
import { confirm } from '../../utils/confirm';
import LanguageSwitch from '../../components/LanguageSwitch';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

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

  const confirmLogout = async () => (await confirm(t("Log out?"), '', { okText: 'Log out', destructive: true })) && logout();
  const deleteAccount = async () => {
    if (!(await confirm(t("Delete your account?"), t(
      "Your listings, vehicles and trips will be removed and you will be logged out. This cannot be undone."
    ), { okText: 'Delete', destructive: true }))) return;
    try {
      await meApi.remove();
      logout('Your account has been deleted.');
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title={t("Account")} back={false} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Row style={{ paddingHorizontal: space.lg, marginBottom: space.lg }} gap={14}>
          {user?.photoUrl ? (
            <CachedImage uri={user.photoUrl} style={{ width: 64, height: 64, borderRadius: 32 }} />
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
              <Badge status={onboarding?.verificationStatus} text={onboarding?.verificationStatus === 'pending' ? t("In review") : undefined} />
            </Row>
          </View>
        </Row>

        <Group title={t("Business")}>
          {caps.driver && <MenuItem icon="person-circle" title={t("Marketplace profile")} sub={t("What customers see")} onPress={() => navigation.navigate('DriverProfile')} />}
          {caps.trips && <MenuItem icon="star" title={t("Ratings & reviews")} sub={t("What passengers say about you")} onPress={() => navigation.navigate('Reviews')} />}
          <MenuItem icon="stats-chart" title={t("Earnings & history")} sub={t("Estimated from your bookings")} onPress={() => navigation.navigate('Earnings')} />
          {caps.trips && <MenuItem icon="navigate" title={t("Share live location")} onPress={() => navigation.navigate('LocationShare')} />}
          {goodsOn && <MenuItem icon="cube" title={t("Goods transport orders")} onPress={() => navigation.navigate('GoodsOrders')} />}
          <MenuItem icon="document-text" title={t("My documents")} onPress={() => navigation.navigate('Documents', { edit: true })} />
          {onboarding?.category?.registrationFee > 0 && <MenuItem icon="card" title={t("Payments & listing")} sub={onboarding?.listing?.expiresAt ? t("Valid till {0}", [fullDate(onboarding.listing.expiresAt)]) : undefined} onPress={() => navigation.navigate('Payments')} />}
        </Group>

        <Group title={t("Profile")}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: space.lg }}>
            <Text style={[font.h3, { flex: 1 }]}>{t('Language')} / ভাষা</Text>
            <LanguageSwitch />
          </View>
          <MenuItem icon="create" title={t("Edit profile")} sub={t("Name, email, photo")} onPress={() => navigation.navigate('EditProfile')} />
          <MenuItem icon="business" title={t("Business & contact details")} onPress={() => navigation.navigate('BusinessDetails', { edit: true })} />
          <MenuItem icon="notifications" title={t("Notifications")} onPress={() => navigation.navigate('Notifications')} />
        </Group>

        <Group title={t("Help")}>
          <MenuItem icon="help-buoy" title={t("Help & support")} sub={t("FAQs and support tickets")} onPress={() => navigation.navigate('Support')} />
          {config?.supportPhone && <MenuItem icon="call" title={t("Call support")} sub={config.supportPhone} onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} />}
        </Group>

        <Group>
          <MenuItem icon="log-out" title={t("Log out")} danger onPress={confirmLogout} right={null} />
          <MenuItem icon="trash" title={t("Delete account")} danger onPress={deleteAccount} right={null} />
        </Group>
        <Text style={[font.small, { textAlign: 'center' }]}>{t("GoTrip Partner v")}{Constants.expoConfig?.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
