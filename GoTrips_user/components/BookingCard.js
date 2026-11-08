import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, RIDE_STATUSES } from '../constants';
import CustomButton from './CustomButton';

const statusColor = (s) => {
  const key = String(s || '').toLowerCase();
  return RIDE_STATUSES[key]?.color || COLORS.text.tertiary;
};

export default function BookingCard({ booking, onViewDetails, onCancel, onRebook }) {
  const vehicleName = booking?.vehicleName || booking?.vehicle?.name || 'Ride';
  const icon = booking?.vehicleType === 'bike' ? 'motorbike' : 'car';
  const pickup = booking?.pickup?.label || booking?.pickupAddress || booking?.from;
  const drop = booking?.drop?.label || booking?.dropAddress || booking?.to;
  const when = booking?.scheduledAt || booking?.date || booking?.createdAt;
  const fare = booking?.fare ?? booking?.amount ?? booking?.price;
  const st = booking?.status || 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <MaterialCommunityIcons name={icon} size={28} color={COLORS.primary} />
        <View style={styles.topText}>
          <Text style={styles.name}>{vehicleName}</Text>
          <Text style={styles.route} numberOfLines={2}>
            {pickup} → {drop}
          </Text>
          <Text style={styles.meta}>{when ? String(when) : ''}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(st) + '22' }]}>
          <Text style={[styles.badgeText, { color: statusColor(st) }]}>{st}</Text>
        </View>
      </View>
      {fare != null ? (
        <Text style={styles.fare}>₹{Number(fare).toFixed(0)}</Text>
      ) : null}
      <View style={styles.actions}>
        <CustomButton title="View Details" variant="outline" onPress={() => onViewDetails?.(booking)} style={styles.btn} />
        {String(st).toLowerCase() === 'cancelled' ? (
          <CustomButton title="Rebook" onPress={() => onRebook?.(booking)} style={styles.btn} />
        ) : String(st).toLowerCase() === 'completed' ? (
          <CustomButton title="Rebook" onPress={() => onRebook?.(booking)} style={styles.btn} />
        ) : (
          <CustomButton title="Cancel" variant="secondary" onPress={() => onCancel?.(booking)} style={styles.btn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  topText: { flex: 1 },
  name: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  route: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: 2 },
  meta: { ...TYPOGRAPHY.small, color: COLORS.text.tertiary, marginTop: 4 },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeText: { ...TYPOGRAPHY.small, fontWeight: '700', textTransform: 'capitalize' },
  fare: { ...TYPOGRAPHY.h4, color: COLORS.text.primary, marginTop: SPACING.sm },
  actions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btn: { flex: 1, height: 44 },
});
