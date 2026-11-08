import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../constants';

const OFFERS = [
  {
    id: '1',
    title: 'FIRST RIDE DISCOUNT',
    subtitle: 'GET 50% OFF',
    code: 'RIDE50',
    valid: 'Valid till 31st Oct',
  },
  {
    id: '2',
    title: 'WEEKEND SPECIAL',
    subtitle: 'FLAT ₹100 OFF',
    code: 'WEEKEND100',
    valid: 'Valid on Sat–Sun',
  },
];

export default function SpecialOffers({ onSeeAll }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.h}>Special Offers</Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {OFFERS.map((o) => (
          <View key={o.id} style={styles.card}>
            <View style={styles.gradientOverlay} />
            <View style={styles.cardInner}>
              <Text style={styles.title}>{o.title}</Text>
              <Text style={styles.sub}>{o.subtitle}</Text>
              <Text style={styles.code}>
                Use Code: {o.code} | {o.valid}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: SPACING.lg },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  h: { ...TYPOGRAPHY.h4, color: COLORS.text.primary },
  seeAll: { ...TYPOGRAPHY.captionBold, color: COLORS.primary },
  row: { gap: SPACING.md, paddingRight: SPACING.md },
  card: {
    width: 280,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    minHeight: 120,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    overflow: 'hidden',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.secondary,
    opacity: 0.45,
  },
  cardInner: { zIndex: 1 },
  title: { ...TYPOGRAPHY.small, fontWeight: '700', color: COLORS.text.white, opacity: 0.95 },
  sub: { ...TYPOGRAPHY.h3, color: COLORS.text.white, marginTop: SPACING.xs },
  code: { ...TYPOGRAPHY.caption, color: COLORS.text.white, marginTop: SPACING.md, opacity: 0.9 },
});
