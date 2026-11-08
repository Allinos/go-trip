import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Chips, ErrorView, Loading, Notice, Row, Screen, Section, Stat } from '../../components/ui';
import { partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { colors, font } from '../../theme';
import { dateLabel, rupees } from '../../utils/format';

const PERIODS = [
  { value: 'week', label: '7 days' },
  { value: 'month', label: '30 days' },
  { value: 'year', label: '12 months' },
  { value: 'all', label: 'All time' },
];

function Bars({ series, bucket }) {
  if (!series?.length) return <Text style={font.sub}>No bookings in this period yet.</Text>;
  const max = Math.max(...series.map((x) => x.earned + x.upcoming), 1);
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 4 }}>
        {series.slice(-14).map((x) => (
          <View key={String(x.bucket)} style={{ flex: 1, maxWidth: 36, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <View style={{ width: '80%', height: `${(x.upcoming / max) * 100}%`, backgroundColor: colors.primaryBorder, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            <View style={{ width: '80%', height: `${(x.earned / max) * 100}%`, backgroundColor: colors.green }} />
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
        <Text style={font.small}>{new Date(series.slice(-14)[0].bucket).toLocaleDateString('en-IN', bucket === 'month' ? { month: 'short' } : { day: 'numeric', month: 'short' })}</Text>
        <Row gap={10}>
          <Row gap={4}><View style={{ width: 10, height: 10, backgroundColor: colors.green, borderRadius: 2 }} /><Text style={font.small}>Completed</Text></Row>
          <Row gap={4}><View style={{ width: 10, height: 10, backgroundColor: colors.primaryBorder, borderRadius: 2 }} /><Text style={font.small}>Upcoming</Text></Row>
        </Row>
      </Row>
    </View>
  );
}

export default function EarningsScreen({ navigation }) {
  const [period, setPeriod] = useState('month');
  const { data: e, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.earnings(period), [period]);
  return (
    <Screen title="Earnings" refreshing={refreshing} onRefresh={refresh}>
      <Chips options={PERIODS} value={period} onChange={setPeriod} />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <>
          <Notice tone="blue" icon="information-circle" text={e.note} />
          <Row style={{ marginBottom: 12 }}>
            <Stat label="Earned" value={rupees(e.summary.earned)} sub={`${e.summary.completedBookings} completed`} icon="checkmark-done" tone="green" />
            <Stat label="Upcoming" value={rupees(e.summary.upcoming)} sub={`${e.summary.acceptedBookings} confirmed`} icon="time" tone="amber" />
          </Row>
          <Row style={{ marginBottom: 16 }}>
            <Stat label="Seats sold" value={e.summary.seatsSold} icon="people" tone="blue" />
            <Stat label="Bookings" value={e.summary.completedBookings + e.summary.acceptedBookings} icon="receipt" />
          </Row>
          <Section title="Trend" icon="bar-chart">
            <Card>
              <Bars series={e.series} bucket={period === 'year' || period === 'all' ? 'month' : 'day'} />
            </Card>
          </Section>
          {e.byVehicle?.length > 0 && (
            <Section title="By vehicle" icon="car">
              <Card>
                {e.byVehicle.map((v) => (
                  <Row key={v.id} style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
                    <View>
                      <Text style={font.body}>{v.make} {v.model}</Text>
                      <Text style={font.small}>{v.registrationNumber} · {v.bookings} bookings</Text>
                    </View>
                    <Text style={[font.h3]}>{rupees(v.estimated)}</Text>
                  </Row>
                ))}
              </Card>
            </Section>
          )}
          <Section title="Booking history" icon="list">
            {e.history.length ? (
              e.history.map((b) => (
                <Card key={b.id} style={{ marginBottom: 8 }} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={font.h3}>{b.pickupName} → {b.dropName}</Text>
                    <Text style={font.h3}>{rupees(b.fareEstimate)}</Text>
                  </Row>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={font.small}>{dateLabel(b.departureAt)} · {b.passengerName || 'Passenger'} · {b.seats} seat(s)</Text>
                    <Badge status={b.status} />
                  </Row>
                </Card>
              ))
            ) : (
              <Text style={font.sub}>No bookings yet.</Text>
            )}
          </Section>
        </>
      )}
    </Screen>
  );
}
