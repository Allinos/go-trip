import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TripCard } from '../../components/cards';
import { Chip, Empty, ErrorView, Header, Loading, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { tripAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { dateLabel } from '../../utils/format';

export default function ResultsScreen() {
  const router = useRouter();
  const p = useLocalSearchParams();
  const [type, setType] = useState('');
  const [anyDay, setAnyDay] = useState(!p.date);
  const params = { from: p.from || undefined, to: p.to || undefined, date: anyDay ? undefined : p.date, seats: p.seats || 1, type: type || undefined, limit: 30 };
  const { data, meta, error, loading, refreshing, reload, refresh } = useFetch(() => tripAPI.search(params), [JSON.stringify(params)]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={`${p.from || 'Anywhere'} → ${p.to || 'Anywhere'}`} />
      <View style={{ paddingHorizontal: SPACING.md, paddingTop: 10 }}>
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>
          {anyDay ? 'Next 60 days' : dateLabel(`${p.date}T12:00:00+05:30`)} · {p.seats || 1} seat(s){meta ? ` · ${meta.total} trip(s)` : ''}
        </Text>
        <Row style={{ marginVertical: 10, flexWrap: 'wrap' }}>
          <Chip label="All trips" active={!type} onPress={() => setType('')} />
          <Chip label="Start trips" active={type === 'start'} onPress={() => setType('start')} />
          <Chip label="Return trips" active={type === 'return'} onPress={() => setType('return')} />
          {p.date ? <Chip label="Any day" active={anyDay} onPress={() => setAnyDay(!anyDay)} /> : null}
        </Row>
      </View>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={{ padding: SPACING.md, paddingTop: 0 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
          renderItem={({ item }) => <TripCard trip={item} onPress={() => router.push({ pathname: '/ride/[id]', params: { id: item.id, pickupSeq: item.match.pickupSeq, dropSeq: item.match.dropSeq, seats: p.seats || 1 } })} />}
          ListEmptyComponent={
            <Empty icon="directions-car" text={anyDay ? 'No trips on this route yet. Drivers add trips every day — check again later, or rent a vehicle.' : 'No trips on this day. Try "Any day".'} action={!anyDay && <Chip label="Show any day" active onPress={() => setAnyDay(true)} />} />
          }
        />
      )}
    </View>
  );
}
