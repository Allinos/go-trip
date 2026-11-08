import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { userAPI, errorMessage } from '../../services/api';
import { confirm } from '../../utils/confirm';
import LanguageSwitch from '../../components/LanguageSwitch';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { t } from '../../i18n';

const Item = ({ icon, title, sub, onPress, danger }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACING.md, backgroundColor: '#fff' }, pressed && { backgroundColor: COLORS.surface }]}>
    <View style={{ backgroundColor: danger ? '#FEF2F2' : COLORS.primaryLight, borderRadius: 10, padding: 8 }}>
      <MaterialIcons name={icon} size={20} color={danger ? COLORS.error : COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[TYPOGRAPHY.bodyBold, danger && { color: COLORS.error }]}>{title}</Text>
      {sub ? <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{sub}</Text> : null}
    </View>
    {!danger && <MaterialIcons name="chevron-right" size={22} color={COLORS.text.tertiary} />}
  </Pressable>
);

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout, config } = useAuthStore();
  const del = async () => {
    if (!(await confirm(t("Delete account?"), t("Your bookings and saved places will be removed. This cannot be undone."), { okText: 'Delete', destructive: true }))) return;
    try {
      await userAPI.remove();
      await logout();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ padding: SPACING.md, backgroundColor: '#fff', marginBottom: SPACING.md }}>
          {isAuthenticated ? (
            <Pressable onPress={() => router.push('/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{(user?.fullName || 'U')[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.h4}>{user?.fullName || t("Add your name")}</Text>
                <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>{user?.phone}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={COLORS.text.tertiary} />
            </Pressable>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={TYPOGRAPHY.h4}>{t("You are browsing as a guest")}</Text>
              <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>{t("Log in to book seats, call drivers and get booking updates.")}</Text>
              <Button title={t("Log in / Sign up")} onPress={() => router.push('/(auth)/login')} />
            </View>
          )}
        </View>
        {isAuthenticated && (
          <View style={{ marginBottom: SPACING.md }}>
            <Item icon="person-outline" title={t("Edit profile")} onPress={() => router.push('/profile/edit')} />
            <Item icon="bookmark-border" title={t("Saved places")} sub={t("Home, work and more")} onPress={() => router.push('/profile/saved-places')} />
            <Item icon="notifications-none" title={t("Notifications")} onPress={() => router.push('/notifications')} />
            {config?.features?.goodsOrders && <Item icon="local-shipping" title={t("Goods transport")} sub={t("Move goods with local trucks")} onPress={() => router.push('/goods')} />}
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: SPACING.md, backgroundColor: '#fff', marginBottom: SPACING.md }}>
          <Text style={[TYPOGRAPHY.bodyBold, { flex: 1 }]}>{t('Language')} / ভাষা</Text>
          <LanguageSwitch />
        </View>
        <View style={{ marginBottom: SPACING.md }}>
          <Item icon="help-outline" title={t("Help & support")} sub={t("FAQs and tickets")} onPress={() => router.push('/support')} />
          {config?.supportPhone && <Item icon="call" title={t("Call support")} sub={config.supportPhone} onPress={() => Linking.openURL(`tel:${config.supportPhone}`)} />}
          <Item icon="storefront" title={t("Become a GoTrip partner")} sub={t("Drivers, taxi & rental owners — download GoTrip Partner")} onPress={() => Linking.openURL('https://play.google.com/store/search?q=GoTrip%20Partner')} />
        </View>
        {isAuthenticated && (
          <View>
            <Item icon="logout" title={t("Log out")} danger onPress={async () => (await confirm(t("Log out?"), '', { okText: 'Log out', destructive: true })) && logout()} />
            <Item icon="delete-outline" title={t("Delete account")} danger onPress={del} />
          </View>
        )}
        <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary, textAlign: 'center', marginTop: 16 }]}>{t("GoTrip v")}{Constants.expoConfig?.version}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
