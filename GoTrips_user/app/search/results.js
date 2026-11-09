import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TripCard } from '../../components/cards';
import { Chip, Empty, ErrorView, Header, Loading, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { tripAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { dateLabel } from '../../utils/format';
import { t } from '../../i18n';

export default function ResultsScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const [type, setType] = useState('');
  const [kind, setKind] = useState(p.kind === 'goods' ? 'goods' : 'passenger');
  const [anyDay, setAnyDay] = useState(!p.date);
  const params = { from: p.from || undefined, to: p.to || undefined, date: anyDay ? undefined : p.date, seats: kind === 'goods' ? 1 : p.seats || 1, type: type || undefined, kind, limit: 30 };
  const { data, meta, error, errorStatus, loading, refreshing, reload, refresh } = useFetch(() => tripAPI.search(params), [JSON.stringify(params)]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={`${p.from || t("Anywhere")} → ${p.to || t("Anywhere")}`} />
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: 10 }}>
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>
          {anyDay ? t("Next 60 days") : dateLabel(`${p.date}T12:00:00+05:30`)}{" · "}{kind === 'goods' ? t("Goods vehicles") : `${p.seats || 1} ${t("seat(s)")}`}{meta ? t(" · {0} trip(s)", [meta.total]) : ''}
        </Text>
        <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <Chip label={t("Seats for people")} active={kind === 'passenger'} onPress={() => setKind('passenger')} />
          <Chip label={t("Vehicle for goods")} active={kind === 'goods'} onPress={() => setKind('goods')} />
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
          renderItem={({ item }) => <TripCard trip={item} onPress={() => router.push({ pathname: '/ride/[id]', params: { id: item.id, pickupSeq: item.match.pickupSeq, dropSeq: item.match.dropSeq, seats: p.seats || 1 } })} />}
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
