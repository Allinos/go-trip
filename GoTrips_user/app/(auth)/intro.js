import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import CustomButton from '../../components/CustomButton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    icon: 'directions-car',
    title: 'Welcome to RideFlow',
    body: 'Book rides, rentals, and more in one place. Your journey starts here.',
  },
  {
    key: '2',
    icon: 'route',
    title: 'Go anywhere',
    body: 'Taxi, bike, rental, or trucks — pick what fits your trip and search in seconds.',
  },
  {
    key: '3',
    icon: 'verified-user',
    title: 'Safe & simple',
    body: 'Verify with your phone, track bookings, and ride with confidence.',
  },
];

export default function IntroScreen() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [page, setPage] = useState(0);

  const onScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / SCREEN_WIDTH);
    if (idx !== page && idx >= 0 && idx < SLIDES.length) setPage(idx);
  };

  const goLogin = () => router.push('/(auth)/login');
  const goRegister = () => router.push({ pathname: '/(auth)/login', params: { flow: 'register' } });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <MaterialIcons name="directions-car" size={28} color={COLORS.primary} />
          <Text style={styles.brandText}>RideFlow</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((s) => (
          <View key={s.key} style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={styles.iconCircle}>
              <MaterialIcons name={s.icon} size={56} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{s.title}</Text>
            <Text style={styles.body}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <CustomButton title="Log in" onPress={goLogin} variant="outline" style={styles.btnHalf} />
        <CustomButton title="Register" onPress={goRegister} style={styles.btnHalf} />
      </View>

      <TouchableOpacity style={styles.skip} onPress={goLogin} hitSlop={12}>
        <Text style={styles.skipText}>Skip to login</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  brandText: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text.primary,
  },
  scrollContent: {
    alignItems: 'stretch',
  },
  slide: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 360,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    width: 22,
    backgroundColor: COLORS.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  btnHalf: {
    flex: 1,
    height: 52,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  skipText: {
    ...TYPOGRAPHY.captionBold,
    color: COLORS.text.tertiary,
  },
});
