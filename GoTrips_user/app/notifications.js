import { useEffect } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Card, Empty, ErrorView, Header, Loading, Row } from '../components/ui';
import useFetch from '../hooks/useFetch';
import { userAPI } from '../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { ago } from '../utils/format';
import { t } from '../i18n';

const ICON = { booking_accepted: 'check-circle', booking_rejected: 'cancel', booking_cancelled: 'cancel', trip_started: 'directions-car', support_reply: 'support-agent' };

export default function Notifications() {
  const router = useRouter();
  const { data, error, loading, refreshing, reload, refresh } = useFetch(() => userAPI.notifications(), [], { cacheKey: 'notifications' });
  useEffect(() => {
    if (data?.some((n) => !n.readAt)) userAPI.markRead().catch(() => {});
  }, [data]);
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Notifications")} />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: SPACING.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
          renderItem={({ item: n }) => (
            <Card style={{ marginBottom: 10, borderColor: n.readAt ? COLORS.border : COLORS.primaryLight }} onPress={() => n.data?.bookingId && router.push(`/booking/${n.data.bookingId}`)}>
              <Row style={{ alignItems: 'flex-start' }}>
                <MaterialIcons name={ICON[n.type] || 'notifications'} size={22} color={n.type === 'booking_accepted' ? COLORS.success : COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={TYPOGRAPHY.bodyBold}>{n.title}</Text>
                  <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 2 }]}>{n.body}</Text>
                  <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary, marginTop: 4 }]}>{ago(n.createdAt)}</Text>
                </View>
              </Row>
            </Card>
          )}
          ListEmptyComponent={<Empty icon="notifications-none" text={t("No notifications yet")} />}
        />
      )}
    </View>
  );
}
