import React, { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Empty, ErrorView, Header, Loading, Notice, Row } from '../../components/ui';
import { tripApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { colors, font, space } from '../../theme';
import { dateLabel, rupees, timeLabel } from '../../utils/format';
import { t } from '../../i18n';

const TABS = [
  ['upcoming', 'Upcoming'],
  ['past', 'Past'],
];

export function TripCard({ trip, onPress, right }) {
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Badge tone={trip.tripType === 'return' ? 'blue' : 'gray'} text={trip.tripType === 'return' ? t("Return trip") : t("Trip")} />
          <Badge status={trip.status} />
          {trip.status === 'scheduled' && !trip.bookingOpen && <Badge tone="gray" text={t("Bookings paused")} />}
        </Row>
        {trip.pendingRequests > 0 && <Badge tone="amber" text={trip.pendingRequests > 1 ? t("{0} new requests", [trip.pendingRequests]) : t("1 new request")} />}
      </Row>
      <Row style={{ marginTop: 10, alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'center', paddingTop: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
          <View style={{ width: 2, height: 22, backgroundColor: colors.primaryBorder }} />
          <Ionicons name="location" size={14} color={colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 10 }}>
          <Text style={font.h3}>{trip.originName}</Text>
          <Text style={font.h3}>{trip.destinationName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={font.h3}>{timeLabel(trip.departureAt)}</Text>
          <Text style={font.small}>{dateLabel(trip.departureAt)}</Text>
        </View>
      </Row>
      {trip.stops?.length > 2 && <Text style={[font.small, { marginTop: 6 }]}>{t("via")}{" "}{trip.stops.slice(1, -1).map((x) => x.placeName).join(', ')}</Text>}
      <Row style={{ marginTop: 10, justifyContent: 'space-between' }}>
        <Text style={font.sub}>
          <Ionicons name="people" size={14} /> {trip.bookedSeats}/{trip.totalSeats}{" "}{t("seats booked")}</Text>
        <Text style={[font.body, { fontWeight: '700' }]}>{rupees(trip.pricePerSeat)}{t("/seat")}</Text>
      </Row>
      {right}
    </Card>
  );
}

export default function TripsScreen({ navigation, route }) {
  const [tab, setTab] = useState(route.params?.tab || 'upcoming');
  const pickReturn = route.params?.pickReturn;
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => tripApi.list({ when: tab, limit: 50 }), [tab], { cacheKey: `trips:${tab}` });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title={t("My trips")} back={false} right={<Button small title={t("New trip")} icon="add" onPress={() => navigation.navigate('TripForm', { tripType: 'start' })} />} />
      <Row style={{ paddingHorizontal: space.lg, marginBottom: 8 }}>
        {TABS.map(([v, l]) => (
          <Button key={v} small title={t(l)} variant={tab === v ? 'primary' : 'secondary'} onPress={() => (setTab(v), navigation.setParams({ pickReturn: false }))} style={{ flex: 1 }} />
        ))}
      </Row>
      {pickReturn && (
        <View style={{ paddingHorizontal: space.lg }}>
          <Notice tone="blue" icon="swap-horizontal" title={t("Create a return trip")} text={t(
            "Choose the trip you are returning from, then tap “Create return trip”. Or create a new trip and choose “Return trip”."
          )} />
        </View>
      )}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(trip) => String(trip.id)}
          contentContainerStyle={{ padding: space.lg, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          renderItem={({ item }) => (
            <TripCard
              trip={item}
              onPress={() => navigation.navigate('TripDetail', { id: item.id })}
              right={pickReturn && item.tripType === 'start' ? <Button small style={{ marginTop: 10 }} icon="swap-horizontal" title={t("Create return trip")} onPress={() => navigation.navigate('TripForm', { returnOf: item })} /> : null}
            />
          )}
          ListEmptyComponent={<Empty icon="map-outline" text={tab === 'upcoming' ? t("No upcoming trips. Create a trip so passengers can book seats.") : t("No past trips yet.")} action={tab === 'upcoming' && <Button small title={t("Create trip")} onPress={() => navigation.navigate('TripForm', { tripType: 'start' })} />} />}
        />
      )}
    </SafeAreaView>
  );
}
