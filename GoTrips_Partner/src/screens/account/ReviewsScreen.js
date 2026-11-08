import React from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Empty, ErrorView, Loading, Row, Screen } from '../../components/ui';
import { partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { colors, font } from '../../theme';
import { ago } from '../../utils/format';
import { t } from '../../i18n';

const GOLD = '#F59E0B';
export const Stars = ({ value = 0, size = 14 }) => (
  <Row gap={1}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons key={i} name={value >= i ? 'star' : value >= i - 0.5 ? 'star-half' : 'star-outline'} size={size} color={GOLD} />
    ))}
  </Row>
);

/** What passengers said after completed trips. Ratings show on your trips in search. */
export default function ReviewsScreen() {
  const { data, meta, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.reviews(), [], { cacheKey: 'reviews' });
  const header = meta?.count ? (
    <Card style={{ marginBottom: 16 }}>
      <Row gap={16}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[font.h1, { fontSize: 36 }]}>{meta.average.toFixed(1)}</Text>
          <Stars value={meta.average} />
          <Text style={[font.small, { marginTop: 4 }]}>{t("{0} rating(s)", [meta.count])}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {[5, 4, 3, 2, 1].map((s) => (
            <Row key={s} gap={6}>
              <Text style={[font.small, { width: 10 }]}>{s}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F1F1F1' }}>
                <View style={{ width: `${(100 * (meta.stars?.[s] || 0)) / meta.count}%`, height: 6, borderRadius: 3, backgroundColor: GOLD }} />
              </View>
            </Row>
          ))}
        </View>
      </Row>
    </Card>
  ) : null;
  return (
    <Screen title={t("Ratings & reviews")} scroll={false} padded={false}>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          renderItem={({ item: r }) => (
            <Card style={{ marginBottom: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Stars value={r.rating} />
                <Text style={font.small}>{ago(r.createdAt)}</Text>
              </Row>
              {r.comment ? <Text style={[font.body, { marginTop: 6 }]}>{r.comment}</Text> : null}
              <Text style={[font.small, { marginTop: 6 }]}>
                {r.by || t("Passenger")}
                {r.route ? ` · ${r.route}` : ''}
              </Text>
            </Card>
          )}
          ListEmptyComponent={<Empty icon="star-outline" text={t("No ratings yet. Passengers can rate you after a completed trip.")} />}
        />
      )}
    </Screen>
  );
}
