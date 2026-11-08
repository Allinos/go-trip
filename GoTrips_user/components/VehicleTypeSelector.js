import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { VEHICLE_TYPES, COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';

const ICON_MAP = {
  car: 'car',
  motorcycle: 'motorbike',
  'car-key': 'car-key',
  truck: 'truck',
};

export default function VehicleTypeSelector({ selected, onSelect }) {
  return (
    <View style={styles.row}>
      {VEHICLE_TYPES.map((v) => {
        const active = selected === v.id;
        return (
          <TouchableOpacity
            key={v.id}
            style={[styles.circle, active && styles.circleActive]}
            onPress={() => onSelect(v.id)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={ICON_MAP[v.icon] || 'car'}
              size={28}
              color={active ? COLORS.primary : COLORS.text.secondary}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {v.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  circle: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 88,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: SPACING.sm,
  },
  circleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  label: {
    ...TYPOGRAPHY.small,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  labelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
