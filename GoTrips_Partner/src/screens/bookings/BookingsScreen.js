import React, { useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BookingCard from '../../components/BookingCard';
import { Empty, ErrorView, Header, Loading } from '../../components/ui';
import { bookingApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { colors, space } from '../../theme';
import { t } from '../../i18n';

const TABS = [
  ['pending', 'New requests'],
  ['accepted', 'Confirmed'],
  ['completed', 'Completed'],
  ['', 'All'],
];

export default function BookingsScreen({ navigation }) {
  const [status, setStatus] = useState('pending');
  const { data, meta, error, loading, reload, refresh, refreshing } = useApi(() => bookingApi.list({ status: status || undefined, limit: 50 }), [status], { cacheKey: `bookings:${status}` });
  const counts = meta?.counts || {};
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title={t("Bookings")} back={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: space.lg, gap: 8, paddingBottom: 8 }}>
        {TABS.map(([v, l]) => {
          const on = status === v;
          const n = v ? counts[v] : undefined;
          return (
            <Pressable key={v || 'all'} onPress={() => setStatus(v)} style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: on ? colors.primary : colors.card, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border }}>
              <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600' }}>
                {t(l)}
                {n ? ` (${n})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={{ padding: space.lg, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          renderItem={({ item }) => <BookingCard booking={item} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: item.id })} />}
          ListEmptyComponent={<Empty icon="mail-open-outline" text={status === 'pending' ? t(
            "No new booking requests. Passengers send requests when they find your trips."
          ) : t("Nothing here yet.")} />}
        />
      )}
    </SafeAreaView>
  );
}
