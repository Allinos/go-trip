import React from 'react';
import { Text } from 'react-native';
import { Badge, Button, Card, Empty, ErrorView, KV, Loading, Notice, Row, Screen } from '../../components/ui';
import { paymentApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { font } from '../../theme';
import { dateTimeLabel, fullDate, paise } from '../../utils/format';

export default function PaymentsScreen({ navigation }) {
  const { onboarding } = useAuth();
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => paymentApi.list());
  const expiry = onboarding?.listing?.expiresAt;
  const daysLeft = expiry ? Math.ceil((new Date(expiry) - Date.now()) / 86400_000) : null;
  return (
    <Screen title="Payments & listing" refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={font.small}>LISTING STATUS</Text>
        <Text style={[font.h2, { marginTop: 4 }]}>{onboarding?.listing?.isListed ? 'Live on marketplace' : 'Not listed'}</Text>
        {expiry && <Text style={font.sub}>{daysLeft > 0 ? `Valid till ${fullDate(expiry)} (${daysLeft} days left)` : `Expired on ${fullDate(expiry)}`}</Text>}
        {(daysLeft == null || daysLeft <= 15) && <Button title={daysLeft != null && daysLeft <= 0 ? 'Renew now' : 'Renew listing'} icon="refresh" onPress={() => navigation.navigate('RenewPayment', { renew: true })} style={{ marginTop: 12 }} />}
      </Card>
      {daysLeft != null && daysLeft > 15 && <Notice tone="blue" text="You can renew 15 days before your listing expires. The new period starts after the current one ends." />}
      <Text style={[font.h2, { marginBottom: 8 }]}>Payment history</Text>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : data.length ? (
        data.map((p) => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={font.h3}>{paise(p.amount)}</Text>
              <Badge status={p.status} text={p.status === 'created' ? 'Not completed' : undefined} />
            </Row>
            <KV label="Receipt" value={p.receipt} mono />
            <KV label="Date" value={dateTimeLabel(p.paidAt || p.createdAt)} />
            {p.razorpayPaymentId && <KV label="Payment ID" value={p.razorpayPaymentId} mono />}
            {p.validUntil && <KV label="Valid till" value={fullDate(p.validUntil)} />}
          </Card>
        ))
      ) : (
        <Empty text="No payments yet" />
      )}
    </Screen>
  );
}
