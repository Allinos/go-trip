import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isOutline = variant === 'outline';
  const isSecondary = variant === 'secondary';

  const bg =
    variant === 'primary'
      ? COLORS.primary
      : isSecondary
        ? COLORS.surface
        : 'transparent';
  const borderColor = isOutline ? COLORS.primary : 'transparent';
  const color =
    variant === 'primary'
      ? COLORS.text.white
      : isOutline
        ? COLORS.primary
        : COLORS.text.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.base,
        { backgroundColor: bg, borderColor, borderWidth: isOutline ? 2 : 0 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator color={variant === 'primary' ? COLORS.text.white : COLORS.primary} />
        </View>
      ) : (
        <Text style={[styles.label, { color }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    ...TYPOGRAPHY.bodyBold,
  },
  disabled: {
    opacity: 0.55,
  },
});
