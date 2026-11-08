import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const name = user?.fullName || user?.name || 'User';
  const phone = user?.phoneNumber || user?.phone || '';
  const photo = user?.photoUrl || user?.avatar;
  const verified = user?.verified || user?.isVerified;

  const row = (icon, title, onPress) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={22} color={COLORS.text.secondary} />
      <Text style={styles.itemTitle}>{title}</Text>
      <MaterialIcons name="chevron-right" size={22} color={COLORS.text.tertiary} style={styles.rowChevron} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.screenTitle}>Settings</Text>

        <View style={styles.profileCard}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <MaterialIcons name="person" size={40} color={COLORS.text.tertiary} />
            </View>
          )}
          <View style={styles.profileText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{name}</Text>
              {verified ? (
                <View style={styles.badge}>
                  <MaterialIcons name="verified" size={16} color={COLORS.success} />
                  <Text style={styles.badgeTxt}>Verified</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.phone}>{phone}</Text>
            <TouchableOpacity style={styles.viewProf} onPress={() => router.push('/profile')}>
              <Text style={styles.viewProfTxt}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.section}>ACCOUNT</Text>
        {row('edit', 'Edit Profile', () => router.push('/profile/edit'))}
        {row('verified-user', 'Identity Verification', () => router.push('/profile/verification'))}
        {row('bookmark', 'Saved Places', () => router.push('/profile/saved-places'))}
        {row('payment', 'Payment Methods', () => {})}
        <Divider />

        <Text style={styles.section}>PREFERENCES</Text>
        {row('notifications', 'Notifications', () => {})}
        {row('language', 'Language', () => {})}
        {row('brightness-6', 'Theme (Light/Dark)', () => {})}
        <Divider />

        <Text style={styles.section}>SUPPORT</Text>
        {row('help-outline', 'Help Center', () => {})}
        {row('support-agent', 'Contact Support', () => {})}
        {row('quiz', 'FAQs', () => {})}
        <Divider />

        <Text style={styles.section}>LEGAL</Text>
        {row('gavel', 'Terms & Conditions', () => {})}
        {row('privacy-tip', 'Privacy Policy', () => {})}
        {row('info-outline', 'About RideFlow', () => {})}

        <TouchableOpacity
          style={styles.logout}
          onPress={() => {
            Alert.alert('Logout', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  await logout();
                  router.replace('/(auth)/intro');
                },
              },
            ]);
          }}
        >
          <Text style={styles.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SPACING.xxl },
  screenTitle: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  profileCard: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.divider },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  profileText: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' },
  name: { ...TYPOGRAPHY.h4, color: COLORS.text.primary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeTxt: { ...TYPOGRAPHY.small, color: COLORS.success, fontWeight: '600' },
  phone: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 4 },
  viewProf: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  viewProfTxt: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },
  section: {
    ...TYPOGRAPHY.small,
    fontWeight: '700',
    color: COLORS.text.tertiary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
  },
  rowChevron: { marginLeft: 'auto' },
  itemTitle: { ...TYPOGRAPHY.body, color: COLORS.text.primary, flex: 1 },
  logout: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  logoutTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.primary },
});
