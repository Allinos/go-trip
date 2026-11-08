import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import CustomButton from './CustomButton';

export default function DriverCard({ driver, onPress }) {
  const name = driver?.name || driver?.fullName || 'Driver';
  const photo = driver?.photoUrl || driver?.avatar || driver?.image;
  const rating = driver?.rating ?? 4.8;
  const exp = driver?.experience || driver?.experienceLabel || '5+ years';
  const langs = (driver?.languages || ['Hindi', 'English']).join(', ');
  const unlock = driver?.unlockPrice ?? 49;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(driver)} activeOpacity={0.9}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPh]}>
          <MaterialIcons name="person" size={36} color={COLORS.text.tertiary} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.ratingRow}>
            <MaterialIcons name="star" size={14} color={COLORS.warning} />
            <Text style={styles.rating}>{Number(rating).toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{exp}</Text>
        </View>
        <Text style={styles.langs} numberOfLines={2}>
          {langs}
        </Text>
        <View style={styles.unlock}>
          <Text style={styles.unlockText}>₹{unlock} to unlock</Text>
        </View>
        <CustomButton title="View Profile" onPress={() => onPress?.(driver)} style={styles.btn} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
  },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, flex: 1, marginRight: SPACING.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating: { ...TYPOGRAPHY.captionBold, color: COLORS.text.secondary },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
    marginTop: SPACING.xs,
  },
  badgeText: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '700' },
  langs: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.xs },
  unlock: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.surface,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  unlockText: { ...TYPOGRAPHY.captionBold, color: COLORS.text.primary },
  btn: { marginTop: SPACING.sm, height: 40 },
});
