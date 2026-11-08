import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';

const DEFAULT_ITEMS = [
  { id: '1', from: 'Office', to: 'Home', sub: 'Madhapur to Jubilee Hills' },
  { id: '2', from: 'Airport', to: 'Hotel', sub: 'Last trip · 2 days ago' },
  { id: '3', from: 'Mall', to: 'Home', sub: 'Last trip · 1 week ago' },
];

export default function QuickRebook({ items = DEFAULT_ITEMS, onRebook }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Quick Rebook</Text>
      {items.slice(0, 3).map((r) => (
        <TouchableOpacity
          key={r.id}
          style={styles.card}
          onPress={() => onRebook?.(r)}
          activeOpacity={0.9}
        >
          <View style={styles.row}>
            <Text style={styles.route}>
              {r.from} → {r.to}
            </Text>
            <MaterialIcons name="arrow-forward-ios" size={16} color={COLORS.text.tertiary} />
          </View>
          <Text style={styles.sub}>{r.sub}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: SPACING.lg },
  h: { ...TYPOGRAPHY.h4, color: COLORS.text.primary, marginBottom: SPACING.sm },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  route: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginTop: SPACING.xs },
});
