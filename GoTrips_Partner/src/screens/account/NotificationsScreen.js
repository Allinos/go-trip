import React, { useEffect } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, ErrorView, Loading, Row, Screen } from '../../components/ui';
import { meApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { colors, font } from '../../theme';
import { ago } from '../../utils/format';
import { t } from '../../i18n';

const ICON = { booking_request: 'person-add', booking_cancelled: 'close-circle', vehicle_approved: 'checkmark-circle', vehicle_rejected: 'alert-circle', vehicle_suspended: 'ban', documents_approved: 'shield-checkmark', documents_rejected: 'alert-circle', payment_success: 'card', registration_complete: 'ribbon', listing_expiring: 'time', support_reply: 'chatbubbles' };

export default function NotificationsScreen({ navigation }) {
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => meApi.notifications(), [], { cacheKey: 'notifications' });
  useEffect(() => {
    if (data?.some((n) => !n.readAt)) meApi.markRead().catch(() => {});
  }, [data]);
  const open = (n) => {
    const d = n.data || {};
    if (d.bookingId) navigation.navigate('BookingDetail', { id: d.bookingId });
    else if (d.vehicleId) navigation.navigate('VehicleDetail', { id: d.vehicleId });
    else if (d.screen === 'Documents') navigation.navigate('Documents', { edit: true });
    else if (d.screen === 'Payments') navigation.navigate('Payments');
    else if (d.screen === 'Support') navigation.navigate('Support');
  };
  return (
    <Screen title={t("Notifications")} scroll={false} padded={false}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          renderItem={({ item: n }) => (
            <Card style={{ marginBottom: 10, borderColor: n.readAt ? '#F1F1F1' : colors.primaryBorder }} onPress={() => open(n)}>
              <Row style={{ alignItems: 'flex-start' }}>
                <View style={{ backgroundColor: colors.primarySoft, borderRadius: 10, padding: 8 }}>
                  <Ionicons name={ICON[n.type] || 'notifications'} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>{n.title}</Text>
                  <Text style={[font.sub, { marginTop: 2 }]}>{n.body}</Text>
                  <Text style={[font.small, { marginTop: 4 }]}>{ago(n.createdAt)}</Text>
                </View>
              </Row>
            </Card>
          )}
          ListEmptyComponent={<Empty icon="notifications-off-outline" text={t("No notifications yet")} />}
        />
      )}
    </Screen>
  );
}
