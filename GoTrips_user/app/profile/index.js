import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../../store/authStore';
import { userAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function ProfileScreen() {
  const router = useRouter();
  const { user: cached, updateUser } = useAuthStore();
  const [user, setUser] = useState(cached);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await userAPI.getProfile();
        const data = res?.data?.user ?? res?.data ?? res?.user ?? res;
        if (!cancelled && data) {
          setUser(data);
          await updateUser(data);
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
          setUser(cached);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cached?.id, cached?.phoneNumber]);

  if (loading && !user) {
    return (
      <>
        <Stack.Screen options={{ title: 'Profile' }} />
        <LoadingSpinner />
      </>
    );
  }

  const u = user || cached || {};
  const name = u.fullName || u.name || 'User';
  const verified = u.verified || u.isVerified;
  const rides = u.totalRides ?? u.stats?.rides ?? 0;
  const spent = u.totalSpent ?? u.stats?.spent ?? 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/profile/edit')} style={{ marginRight: 12 }}>
              <MaterialIcons name="edit" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          {u.photoUrl || u.avatar ? (
            <Image source={{ uri: u.photoUrl || u.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.ph]}>
              <MaterialIcons name="person" size={64} color={COLORS.text.tertiary} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{name}</Text>
        {u.email ? <Text style={styles.email}>{u.email}</Text> : null}
        <Text style={styles.phone}>{u.phoneNumber || u.phone || ''}</Text>
        {verified ? (
          <View style={styles.badge}>
            <MaterialIcons name="verified" size={18} color={COLORS.success} />
            <Text style={styles.badgeTxt}>Verified</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.badgeWarn]}>
            <Text style={styles.badgeWarnTxt}>Not verified</Text>
          </View>
        )}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{rides}</Text>
            <Text style={styles.statLbl}>Total rides</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>₹{Number(spent).toFixed(0)}</Text>
            <Text style={styles.statLbl}>Spent</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile/edit')}>
          <Text style={styles.editBtnTxt}>Edit profile</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl, alignItems: 'center' },
  avatarWrap: { marginBottom: SPACING.md },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface },
  ph: { alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPOGRAPHY.h2, color: COLORS.text.primary },
  email: { ...TYPOGRAPHY.body, color: COLORS.text.secondary, marginTop: SPACING.xs },
  phone: { ...TYPOGRAPHY.caption, color: COLORS.text.tertiary, marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.surface,
  },
  badgeTxt: { ...TYPOGRAPHY.captionBold, color: COLORS.success },
  badgeWarn: { backgroundColor: COLORS.primaryLight },
  badgeWarnTxt: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },
  stats: {
    flexDirection: 'row',
    marginTop: SPACING.xl,
    gap: SPACING.xl,
  },
  stat: { alignItems: 'center' },
  statVal: { ...TYPOGRAPHY.h2, color: COLORS.primary },
  statLbl: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 4 },
  editBtn: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  editBtnTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.primary },
});
