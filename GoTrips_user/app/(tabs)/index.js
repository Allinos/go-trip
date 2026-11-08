import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import PlacePicker from '../../components/PlacePicker';
import { Button, Chip, Row } from '../../components/ui';
import { BookingCard } from '../../components/cards';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { bookingAPI, userAPI } from '../../services/api';
import { BORDER_RADIUS, COLORS, SERVICES, SPACING, TYPOGRAPHY } from '../../constants';
import { isoDay } from '../../utils/format';

const POPULAR_ROUTES = [
  ['Nagaon', 'Guwahati'],
  ['Guwahati', 'Nagaon'],
  ['Jorhat', 'Guwahati'],
  ['Tezpur', 'Guwahati'],
];

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, user, config } = useAuthStore();
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [day, setDay] = useState('today'); // today | tomorrow | any | custom
  const [custom, setCustom] = useState(null);
  const [showDate, setShowDate] = useState(false);
  const [seats, setSeats] = useState(1);
  const [picker, setPicker] = useState(null);
  const upcoming = useFetch(() => bookingAPI.list({ when: 'upcoming', limit: 2 }), [isAuthenticated], { enabled: isAuthenticated });
  const unread = useFetch(() => userAPI.unread(), [isAuthenticated], { enabled: isAuthenticated });

  const dateParam = () => {
    if (day === 'today') return isoDay(new Date());
    if (day === 'tomorrow') return isoDay(Date.now() + 86400_000);
    if (day === 'custom' && custom) return isoDay(custom);
    return undefined;
  };
  const search = (f = from?.name, t = to?.name) => router.push({ pathname: '/search/results', params: { from: f || '', to: t || '', date: dateParam() || '', seats } });

  const services = SERVICES.filter((s) => !s.feature || config?.features?.[s.feature]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <SafeAreaView edges={['top']} style={styles.redTop}>
        <Row style={{ justifyContent: 'space-between', marginBottom: SPACING.md }}>
          <Row>
            <MaterialCommunityIcons name="car" size={30} color="#fff" />
            <Text style={[TYPOGRAPHY.h3, { color: '#fff' }]}>GoTrip</Text>
          </Row>
          <Pressable hitSlop={12} onPress={() => router.push(isAuthenticated ? '/notifications' : '/(auth)/login')} accessibilityLabel="Notifications">
            <MaterialIcons name="notifications-none" size={28} color="#fff" />
            {unread.data?.unread > 0 && <View style={styles.dot} />}
          </Pressable>
        </Row>
        <Text style={{ color: '#FECACA', fontSize: 15 }}>{user?.fullName ? `Hi ${user.fullName.split(' ')[0]} 👋` : 'Hi there 👋'}</Text>
        <Text style={[TYPOGRAPHY.h2, { color: '#fff' }]}>Where are you going?</Text>
        <Row style={{ justifyContent: 'space-around', marginTop: SPACING.md }}>
          {services.map((sv) => (
            <Pressable key={sv.id} onPress={() => sv.id !== 'trips' && router.push(sv.route)} style={{ alignItems: 'center', gap: 4 }}>
              <View style={[styles.circle, sv.id === 'trips' && { backgroundColor: '#fff' }]}>
                <MaterialCommunityIcons name={sv.icon} size={26} color={sv.id === 'trips' ? COLORS.primary : '#fff'} />
              </View>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>{sv.label}</Text>
            </Pressable>
          ))}
        </Row>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={styles.searchCard}>
          <Pressable style={styles.field} onPress={() => setPicker('from')}>
            <MaterialIcons name="trip-origin" size={20} color={COLORS.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>From</Text>
              <Text style={[TYPOGRAPHY.body, { color: from ? COLORS.text.primary : COLORS.text.tertiary }]}>{from?.name || 'Leaving from'}</Text>
            </View>
          </Pressable>
          <Pressable style={styles.swap} onPress={() => (setFrom(to), setTo(from))} accessibilityLabel="Swap">
            <MaterialIcons name="swap-vert" size={22} color={COLORS.primary} />
          </Pressable>
          <Pressable style={[styles.field, { borderTopWidth: 1, borderTopColor: COLORS.divider }]} onPress={() => setPicker('to')}>
            <MaterialIcons name="place" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>To</Text>
              <Text style={[TYPOGRAPHY.body, { color: to ? COLORS.text.primary : COLORS.text.tertiary }]}>{to?.name || 'Going to'}</Text>
            </View>
          </Pressable>
          <Row style={{ flexWrap: 'wrap', marginTop: SPACING.sm }}>
            <Chip label="Today" active={day === 'today'} onPress={() => setDay('today')} />
            <Chip label="Tomorrow" active={day === 'tomorrow'} onPress={() => setDay('tomorrow')} />
            <Chip label={day === 'custom' && custom ? custom.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Pick date'} active={day === 'custom'} onPress={() => (Platform.OS === 'web' ? (setDay('custom'), setCustom(new Date(Date.now() + 2 * 86400_000))) : setShowDate(true))} />
            <Chip label="Any day" active={day === 'any'} onPress={() => setDay('any')} />
          </Row>
          <Row style={{ justifyContent: 'space-between', marginTop: SPACING.md }}>
            <Text style={TYPOGRAPHY.captionBold}>Seats</Text>
            <Row>
              <Pressable style={styles.step} onPress={() => setSeats(Math.max(1, seats - 1))} accessibilityLabel="Fewer seats">
                <MaterialIcons name="remove" size={20} color={COLORS.primary} />
              </Pressable>
              <Text style={[TYPOGRAPHY.h4, { minWidth: 26, textAlign: 'center' }]}>{seats}</Text>
              <Pressable style={styles.step} onPress={() => setSeats(Math.min(10, seats + 1))} accessibilityLabel="More seats">
                <MaterialIcons name="add" size={20} color={COLORS.primary} />
              </Pressable>
            </Row>
          </Row>
          <Button title="Search trips" icon="search" onPress={() => search()} style={{ marginTop: SPACING.md }} disabled={!from && !to} />
        </View>
        {showDate && (
          <DateTimePicker
            value={custom || new Date()}
            minimumDate={new Date()}
            mode="date"
            onChange={(e, d) => {
              setShowDate(false);
              if (d && e.type !== 'dismissed') (setCustom(d), setDay('custom'));
            }}
          />
        )}

        {upcoming.data?.length > 0 && (
          <>
            <Text style={styles.section}>Your upcoming trips</Text>
            {upcoming.data.map((b) => (
              <BookingCard key={b.id} booking={b} onPress={() => router.push(`/booking/${b.id}`)} />
            ))}
          </>
        )}

        <Text style={styles.section}>Popular routes</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {POPULAR_ROUTES.map(([a, b]) => (
            <Pressable key={a + b} style={styles.route} onPress={() => search(a, b)}>
              <Text style={TYPOGRAPHY.captionBold}>
                {a} → {b}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>More from GoTrip</Text>
        <Row style={{ alignItems: 'stretch' }}>
          <Pressable style={[styles.promo, { backgroundColor: '#FFF7ED' }]} onPress={() => router.push('/(tabs)/rental')}>
            <MaterialCommunityIcons name="car-key" size={28} color="#EA580C" />
            <Text style={TYPOGRAPHY.bodyBold}>Rent a vehicle</Text>
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>Self-drive or with driver</Text>
          </Pressable>
          <Pressable style={[styles.promo, { backgroundColor: '#EFF6FF' }]} onPress={() => router.push('/(tabs)/marketplace')}>
            <MaterialCommunityIcons name="card-account-details" size={28} color={COLORS.info} />
            <Text style={TYPOGRAPHY.bodyBold}>Hire a driver</Text>
            <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>Verified local drivers</Text>
          </Pressable>
        </Row>
      </ScrollView>
      <PlacePicker visible={!!picker} title={picker === 'from' ? 'Leaving from' : 'Going to'} onClose={() => setPicker(null)} onSelect={(p) => (picker === 'from' ? setFrom(p) : setTo(p))} />
    </View>
  );
}

const styles = StyleSheet.create({
  redTop: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg, borderBottomLeftRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.xl },
  dot: { position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#FDE047' },
  circle: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  searchCard: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginTop: -4, borderWidth: 1, borderColor: COLORS.border },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  fieldLabel: { ...TYPOGRAPHY.small, color: COLORS.text.tertiary },
  swap: { position: 'absolute', right: 16, top: 50, zIndex: 2, backgroundColor: COLORS.primaryLight, borderRadius: 20, padding: 6 },
  step: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  section: { ...TYPOGRAPHY.h4, marginTop: SPACING.lg, marginBottom: SPACING.sm, color: COLORS.text.primary },
  route: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  promo: { flex: 1, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, gap: 4 },
});
