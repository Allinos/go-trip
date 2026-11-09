import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, Loading, Notice, ProgressSteps, Row, Screen } from '../../components/ui';
import { partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useAdvance, progressSteps } from './flow';
import { colors, font } from '../../theme';
import { fullDate } from '../../utils/format';
import { t } from '../../i18n';

/** List of required documents with status. Used in onboarding and from Account → My documents. */
export default function DocumentsScreen({ navigation, route }) {
  const inOnboarding = !route.params?.edit;
  const { onboarding, logout } = useAuth();
  const { data, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.documents(), [], { cacheKey: 'documents' });
  const advance = useAdvance(navigation);

  if (loading) return <Loading full />;
  const items = data || [];
  const missing = items.filter((i) => i.requirement.isRequired && (!i.document || i.document.status === 'rejected'));

  const required = items.filter((i) => i.requirement.isRequired);
  const done = required.length - missing.length;
  const next = async () => advance((await partnerApi.onboarding()).data);

  return (
    <Screen
      title={inOnboarding ? t("Partner registration") : t("My documents")}
      back={!inOnboarding}
      right={inOnboarding && <Button title={t("Log out")} variant="ghost" small onPress={logout} />}
      refreshing={refreshing}
      onRefresh={refresh}
      footer={inOnboarding ? <Button title={missing.length ? missing.length > 1 ? t("Upload {0} more documents", [missing.length]) : t("Upload 1 more document") : t("Continue to review")} disabled={missing.length > 0} onPress={next} /> : null}
    >
      {inOnboarding && <ProgressSteps steps={progressSteps(onboarding)} current="documents" />}
      {inOnboarding && (
        <>
          <Text style={font.h1}>{t("Upload your documents")}</Text>
          <Text style={[font.sub, { marginTop: 4, marginBottom: 12 }]}>{t(
            "Take clear photos. Our team checks them to keep GoTrip safe. Your documents are private and never shown to customers."
          )}</Text>
          <Text style={[font.small, { fontWeight: '600', marginBottom: 6 }]}>{t("{0} of {1} required documents uploaded", [done, required.length])}</Text>
          <View style={{ height: 6, backgroundColor: colors.divider, borderRadius: 3, marginBottom: 16 }}>
            <View style={{ height: 6, width: `${required.length ? (done / required.length) * 100 : 100}%`, backgroundColor: colors.green, borderRadius: 3 }} />
          </View>
        </>
      )}
      {!inOnboarding && onboarding?.verificationStatus === 'rejected' && <Notice tone="red" title={t("Some documents were rejected")} text={onboarding.rejectionReason} />}
      {!inOnboarding && onboarding?.verificationStatus === 'pending' && <Notice tone="blue" icon="time" title={t("Under review")} text={t("We are checking your documents. You will get a notification.")} />}
      {error && <ErrorView message={error} onRetry={reload} />}
      {items.map(({ requirement: r, document: d }) => (
        <Card key={r.docType} style={{ marginBottom: 12 }} onPress={() => navigation.navigate('DocumentUpload', { requirement: r, document: d, scope: 'partner' })}>
          <Row>
            <View style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: d ? (d.status === 'rejected' ? colors.primarySoft : colors.greenSoft) : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={d ? (d.status === 'rejected' ? 'alert-circle' : 'checkmark-circle') : 'cloud-upload'} size={22} color={d ? (d.status === 'rejected' ? colors.primaryDark : colors.green) : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>
                {r.label}
                {!r.isRequired && <Text style={font.small}>{" "}{t("(optional)")}</Text>}
              </Text>
              <Text style={font.small}>{d ? (d.status === 'rejected' ? t("Rejected: {0}", [d.rejectionReason || 'please re-upload']) : t(
                "Uploaded{0}",
                [d.expiryDate ? ` · valid till ${fullDate(d.expiryDate)}` : '']
              )) : r.hint || t("Tap to upload")}</Text>
            </View>
            {d ? <Badge status={d.status} text={d.status === 'pending' ? t("In review") : undefined} /> : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
          </Row>
        </Card>
      ))}
    </Screen>
  );
}
