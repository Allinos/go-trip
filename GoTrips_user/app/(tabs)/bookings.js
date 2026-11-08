import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BookingCard } from '../../components/cards';
import { Button, Chip, Empty, ErrorView, Loading, Row } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { bookingAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { t } from '../../i18n';

export default function BookingsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [when, setWhen] = useState('upcoming');
  const { data, error, errorStatus, loading, refreshing, reload, refresh } = useFetch(() => bookingAPI.list({ when, limit: 50 }), [when, isAuthenticated], { enabled: isAuthenticated, cacheKey: `bookings:${when}` });

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Text style={[TYPOGRAPHY.h2, { padding: SPACING.md, paddingBottom: 8 }]}>{t("My bookings")}</Text>
      {!isAuthenticated ? (
        <Empty icon="lock-outline" text={t("Log in to see your seat bookings and their status.")} action={<Button title={t("Log in")} onPress={() => router.push('/(auth)/login')} />} />
      ) : (
        <>
          <Row style={{ paddingHorizontal: SPACING.md, marginBottom: 8 }}>
            <Chip label={t("Upcoming")} active={when === 'upcoming'} onPress={() => setWhen('upcoming')} />
            <Chip label={t("Past")} active={when === 'past'} onPress={() => setWhen('past')} />
          </Row>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorView message={error} status={errorStatus} onRetry={reload} />
          ) : (
            <FlatList
              data={data}
              keyExtractor={(b) => String(b.id)}
              contentContainerStyle={{ padding: SPACING.md }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
              renderItem={({ item }) => <BookingCard booking={item} onPress={() => router.push(`/booking/${item.id}`)} />}
              ListEmptyComponent={<Empty icon="event-busy" text={when === 'upcoming' ? t("No upcoming bookings. Search a route to find trips with free seats.") : t("No past bookings yet.")} action={when === 'upcoming' && <Button small title={t("Find a trip")} onPress={() => router.push('/')} />} />}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}
