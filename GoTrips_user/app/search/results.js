import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TripCard } from '../../components/cards';
import { Chip, Empty, ErrorView, Header, Loading, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { bookingAPI, tripAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { dateLabel } from '../../utils/format';
import { t } from '../../i18n';

export default function ResultsScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const [type, setType] = useState('');
  // Every vehicle type by default; the chips narrow it down.
  const [kind, setKind] = useState(['goods', 'passenger'].includes(p.kind) ? p.kind : '');
  const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
  // Trips this user already asked for are shown faded with a "Booked" mark (they stay openable).
  const mine = useFetch(() => bookingAPI.list({ when: 'upcoming', limit: 50 }), [isAuthenticated], { enabled: isAuthenticated });
  const bookedTrips = new Set((mine.data || []).map((b) => b.trip?.id ?? b.tripId));
  const [anyDay, setAnyDay] = useState(!p.date);
  const params = { from: p.from || undefined, to: p.to || undefined, date: anyDay ? undefined : p.date, seats: kind === 'goods' ? 1 : p.seats || 1, type: type || undefined, kind: kind || undefined, limit: 30 };
  const { data, meta, error, errorStatus, loading, refreshing, reload, refresh } = useFetch(() => tripAPI.search(params), [JSON.stringify(params)]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={`${p.from || t("Anywhere")} → ${p.to || t("Anywhere")}`} />
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: 10 }}>
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>
          {anyDay ? t("Next 60 days") : dateLabel(`${p.date}T12:00:00+05:30`)}{" · "}{kind === 'goods' ? t("Goods vehicles") : `${p.seats || 1} ${t("seat(s)")}`}{!kind ? ` · ${t("All vehicles")}` : ''}{meta ? t(" · {0} trip(s)", [meta.total]) : ''}
        </Text>
        <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <Chip label={t("All vehicles")} active={!kind} onPress={() => setKind('')} />
          <Chip label={t("Passenger")} active={kind === 'passenger'} onPress={() => setKind('passenger')} />
          <Chip label={t("Commercial (goods)")} active={kind === 'goods'} onPress={() => setKind('goods')} />
        </Row>
        <Row style={{ marginVertical: 10, flexWrap: 'wrap' }}>
          <Chip label={t("All trips")} active={!type} onPress={() => setType('')} />
          <Chip label={t("Start trips")} active={type === 'start'} onPress={() => setType('start')} />
          <Chip label={t("Return trips")} active={type === 'return'} onPress={() => setType('return')} />
          {p.date ? <Chip label={t("Any day")} active={anyDay} onPress={() => setAnyDay(!anyDay)} /> : null}
        </Row>
      </View>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} status={errorStatus} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(trip) => String(trip.id)}
          contentContainerStyle={{ padding: SPACING.md, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
          renderItem={({ item }) => <TripCard trip={item} booked={bookedTrips.has(item.id)} onPress={() => router.push({ pathname: '/ride/[id]', params: { id: item.id, pickupSeq: item.match.pickupSeq, dropSeq: item.match.dropSeq, seats: p.seats || 1 } })} />}
          ListEmptyComponent={
            <Empty icon="directions-car" text={anyDay ? t(
              "No trips on this route yet. Drivers add trips every day — check again later, or rent a vehicle."
            ) : t("No trips on this day. Try \"Any day\".")} action={!anyDay && <Chip label={t("Show any day")} active onPress={() => setAnyDay(true)} />} />
          }
        />
      )}
    </View>
  );
}
