import React from 'react';
import { Text } from 'react-native';
import { Badge, Button, Card, Empty, ErrorView, KV, Loading, Notice, Row, Screen } from '../../components/ui';
import { paymentApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { font } from '../../theme';
import { dateTimeLabel, fullDate, paise } from '../../utils/format';
import { t } from '../../i18n';

export default function PaymentsScreen({ navigation }) {
  const { onboarding } = useAuth();
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => paymentApi.list(), [], { cacheKey: 'payments' });
  const expiry = onboarding?.listing?.expiresAt;
  const daysLeft = expiry ? Math.ceil((new Date(expiry) - Date.now()) / 86400_000) : null;
  return (
    <Screen title={t("Payments & listing")} refreshing={refreshing} onRefresh={refresh}>
      <Card style={{ marginBottom: 16 }}>
        <Text style={font.small}>{t("LISTING STATUS")}</Text>
        <Text style={[font.h2, { marginTop: 4 }]}>{onboarding?.listing?.isListed ? t("Live on marketplace") : t("Not listed")}</Text>
        {expiry && <Text style={font.sub}>{daysLeft > 0 ? t("Valid till {0} ({1} days left)", [fullDate(expiry), daysLeft]) : t("Expired on {0}", [fullDate(expiry)])}</Text>}
        {(daysLeft == null || daysLeft <= 15) && <Button title={daysLeft != null && daysLeft <= 0 ? t("Renew now") : t("Renew listing")} icon="refresh" onPress={() => navigation.navigate('RenewPayment', { renew: true })} style={{ marginTop: 12 }} />}
      </Card>
      {daysLeft != null && daysLeft > 15 && <Notice tone="blue" text={t(
        "You can renew 15 days before your listing expires. The new period starts after the current one ends."
      )} />}
      <Text style={[font.h2, { marginBottom: 8 }]}>{t("Payment history")}</Text>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : data.length ? (
        data.map((p) => (
          <Card key={p.id} style={{ marginBottom: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={font.h3}>{paise(p.amount)}</Text>
              <Badge status={p.status} text={p.status === 'created' ? t("Not completed") : undefined} />
            </Row>
            <KV label={t("Receipt")} value={p.receipt} mono />
            <KV label={t("Date")} value={dateTimeLabel(p.paidAt || p.createdAt)} />
            {p.razorpayPaymentId && <KV label={t("Payment ID")} value={p.razorpayPaymentId} mono />}
            {p.validUntil && <KV label={t("Valid till")} value={fullDate(p.validUntil)} />}
          </Card>
        ))
      ) : (
        <Empty text={t("No payments yet")} />
      )}
    </Screen>
  );
}
