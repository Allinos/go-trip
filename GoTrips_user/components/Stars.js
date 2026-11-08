import { Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../constants';
import { t } from '../i18n';

const GOLD = '#F59E0B';

/** Read-only stars, e.g. ★★★★☆ 4.2 (18). */
export function Stars({ value = 0, size = 14, count, style }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 1 }, style]} accessibilityLabel={t("Rated {0} out of 5", [value])}>
      {[1, 2, 3, 4, 5].map((i) => (
        <MaterialIcons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={GOLD} />
      ))}
      {count != null && <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginLeft: 4 }]}>{value.toFixed(1)} ({count})</Text>}
    </View>
  );
}

/** Compact "★ 4.8 (12)" for cards. */
export const RatingPill = ({ rating }) =>
  rating ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <MaterialIcons name="star" size={14} color={GOLD} />
      <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, fontWeight: '600' }]}>
        {rating.average.toFixed(1)} ({rating.count})
      </Text>
    </View>
  ) : null;

/** Tappable 1–5 stars. */
export function StarInput({ value, onChange, size = 36 }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)} accessibilityRole="button" accessibilityLabel={t("{0} star(s)", [i])} hitSlop={6}>
          <MaterialIcons name={value >= i ? 'star' : 'star-outline'} size={size} color={GOLD} />
        </Pressable>
      ))}
    </View>
  );
}
