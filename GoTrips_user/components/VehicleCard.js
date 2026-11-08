import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';
import CustomButton from './CustomButton';

export default function VehicleCard({ vehicle, onPress }) {
  const name = vehicle?.name || vehicle?.model || 'Vehicle';
  const img = vehicle?.image || vehicle?.thumbnail || vehicle?.photoUrl;
  const rating = vehicle?.rating ?? vehicle?.avgRating ?? 4.5;
  const price = vehicle?.pricePerDay ?? vehicle?.dailyRate ?? vehicle?.price ?? 0;
  const feats = vehicle?.features || vehicle?.tags || ['AC', 'GPS'];

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(vehicle)} activeOpacity={0.9}>
      {img ? (
        <Image source={{ uri: img }} style={styles.img} />
      ) : (
        <View style={[styles.img, styles.imgPh]}>
          <MaterialIcons name="directions-car" size={40} color={COLORS.text.tertiary} />
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>
      <View style={styles.ratingRow}>
        <MaterialIcons name="star" size={16} color={COLORS.warning} />
        <Text style={styles.rating}>{Number(rating).toFixed(1)}</Text>
      </View>
      <Text style={styles.price}>₹{Number(price).toFixed(0)}/day</Text>
      <View style={styles.tags}>
        {(Array.isArray(feats) ? feats : []).slice(0, 3).map((t) => (
          <View key={String(t)} style={styles.tag}>
            <Text style={styles.tagText}>{t}</Text>
          </View>
        ))}
      </View>
      <CustomButton title="View Details" variant="outline" onPress={() => onPress?.(vehicle)} style={styles.btn} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  img: {
    width: '100%',
    height: 110,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  imgPh: { alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginTop: SPACING.sm },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  price: { ...TYPOGRAPHY.bodyBold, color: COLORS.primary, marginTop: SPACING.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.sm },
  tag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  tagText: { ...TYPOGRAPHY.small, color: COLORS.text.secondary },
  btn: { marginTop: SPACING.sm, height: 40 },
});
