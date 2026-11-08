import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';

export default function LoadingSpinner({ text }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {text ? <Text style={styles.text}>{text}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  text: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
});
