import React from 'react';
import { Linking, Text } from 'react-native';
import { Button, Card, Empty, ErrorView, KV, Loading, Notice, Row, Screen } from '../../components/ui';
import { goodsApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { font } from '../../theme';
import { dateLabel, rupees, titleCase } from '../../utils/format';

/** Goods transport orders — only reachable when the feature flag is ON (hidden otherwise). */
export default function GoodsOrdersScreen() {
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => goodsApi.list());
  const call = async (o) => {
    const r = await goodsApi.get(o.id);
    Linking.openURL(r.data.telUrl);
  };
  return (
    <Screen title="Goods orders" refreshing={refreshing} onRefresh={refresh}>
      <Notice tone="blue" icon="cube" text="Customers who need goods moved. Call them to agree the price and time." />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : data.length ? (
        data.map((o) => (
          <Card key={o.id} style={{ marginBottom: 12 }}>
            <Text style={font.h3}>
              {o.pickupName} → {o.dropName}
            </Text>
            <KV label="Goods" value={`${o.goodsType}${o.weightKg ? ` · ${o.weightKg} kg` : ''}`} />
            <KV label="Pickup date" value={dateLabel(o.pickupDate)} />
            {o.vehicleClass ? <KV label="Vehicle needed" value={titleCase(o.vehicleClass)} /> : null}
            {o.budget ? <KV label="Budget" value={rupees(o.budget)} /> : null}
            {o.description ? <Text style={[font.sub, { marginTop: 6 }]}>{o.description}</Text> : null}
            <Row style={{ marginTop: 10 }}>
              <Button style={{ flex: 1 }} small icon="call" title={`Call ${o.user?.fullName || 'customer'}`} onPress={() => call(o)} />
            </Row>
          </Card>
        ))
      ) : (
        <Empty icon="cube-outline" text="No open goods orders right now." />
      )}
    </Screen>
  );
}
