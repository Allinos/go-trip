import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Checkbox } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, Notice, ProgressSteps, Row, Screen, Section } from '../../components/ui';
import { partnerApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdvance, progressSteps } from './flow';
import { colors, font, space } from '../../theme';
import { fullDate, phoneText } from '../../utils/format';
import { t } from '../../i18n';

/**
 * Last registration step: the partner checks every detail and document, confirms they are genuine
 * and submits them for verification. Nothing is activated until this button is pressed.
 */
export default function ReviewSubmitScreen({ navigation }) {
  const { user, onboarding, logout } = useAuth();
  const toast = useToast();
  const advance = useAdvance(navigation);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useApi(async () => {
    const [profile, docs] = await Promise.all([partnerApi.profile(), partnerApi.documents()]);
    return { data: { profile: profile.data, docs: docs.data } };
  });

  if (loading) return <Loading full />;
  if (error) return <Screen title={t('Partner registration')} back={false}><ErrorView message={error} onRetry={reload} /></Screen>;

  const { profile: p, docs } = data;
  const driver = !!onboarding?.category?.hasDriverProfile;
  const pendingBefore = (onboarding?.steps || []).filter((s) => !s.done && !['review', 'payment'].includes(s.key));
  const hasFee = onboarding?.steps?.some((s) => s.key === 'payment' && !s.done);
  const required = docs.filter((d) => d.requirement.isRequired);
  const missingDocs = required.filter((d) => !d.document || d.document.status === 'rejected');
  const ready = pendingBefore.length === 0 && missingDocs.length === 0;

  const edit = (screen) => navigation.navigate(screen, { edit: true });
  const submit = async () => {
    setBusy(true);
    try {
      const r = await partnerApi.submit();
      if (r.data.completed) toast(t('Submitted. Our team will verify your documents.'), 'success');
      advance(r.data);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  const EditLink = ({ to }) => (
    <Pressable onPress={() => edit(to)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('Edit')}>
      <Row gap={4}>
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('Edit')}</Text>
      </Row>
    </Pressable>
  );

  return (
    <Screen
      title={t('Partner registration')}
      back={false}
      right={<Button title={t('Log out')} variant="ghost" small onPress={logout} />}
      onRefresh={reload}
      footer={
        <Button
          title={hasFee ? t('Submit & continue to payment') : t('Submit for verification')}
          icon="shield-checkmark"
          onPress={submit}
          loading={busy}
          disabled={!ready || !agree}
        />
      }
    >
      <ProgressSteps steps={progressSteps(onboarding)} current="review" />
      <Text style={font.h1}>{t('Check your details')}</Text>
      <Text style={[font.sub, { marginTop: 4, marginBottom: space.lg }]}>{t('Make sure everything is correct. Our team verifies it before customers can see you.')}</Text>

      {!ready && (
        <Notice
          tone="red"
          icon="alert-circle"
          title={t('Something is missing')}
          text={[...pendingBefore.map((s) => s.label), ...missingDocs.map((d) => d.requirement.label)].join('\n')}
        />
      )}

      <Section title={t('You')} icon="person-circle" right={<EditLink to="Name" />}>
        <KV label={t('Name')} value={user?.fullName} />
        <KV label={t('Mobile')} value={phoneText(user?.phone)} />
        {user?.email ? <KV label={t('Email')} value={user.email} /> : null}
        <KV label={t('Partner type')} value={onboarding?.category?.name} />
      </Section>

      {driver ? (
        <Section title={t('Driver details')} icon="id-card" right={<EditLink to="DriverDetails" />}>
          <KV label={t('District')} value={p.district} />
          <KV label={t('City / town')} value={p.city} />
        </Section>
      ) : (
        <Section title={t('Business details')} icon="business" right={<EditLink to="BusinessDetails" />}>
          {p.businessName ? <KV label={t('Business name')} value={p.businessName} /> : null}
          <KV label={t('Address')} value={p.address} />
          <KV label={t('City / town')} value={p.city} />
          <KV label={t('District')} value={p.district} />
          <KV label={t('PIN code')} value={p.pincode} />
          {p.whatsappPhone ? <KV label={t('WhatsApp')} value={phoneText(p.whatsappPhone)} /> : null}
        </Section>
      )}

      <Section title={t('Documents')} icon="document-text" right={<EditLink to="Documents" />}>
        {docs.map(({ requirement: r, document: d }) => (
          <Row key={r.docType} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Ionicons name={d && d.status !== 'rejected' ? 'checkmark-circle' : r.isRequired ? 'alert-circle' : 'ellipse-outline'} size={20} color={d && d.status !== 'rejected' ? colors.green : r.isRequired ? colors.primaryDark : colors.faint} />
            <View style={{ flex: 1 }}>
              <Text style={font.body}>{r.label}</Text>
              <Text style={font.small}>
                {d ? [d.docNumber, d.expiryDate && t('valid till {0}', [fullDate(d.expiryDate)]), d.backUrl ? t('front & back') : null].filter(Boolean).join(' · ') || t('Uploaded') : r.isRequired ? t('Required — not uploaded') : t('Optional')}
              </Text>
            </View>
            {d ? <Badge status={d.status === 'pending' ? 'pending' : d.status} text={d.status === 'pending' ? t('Uploaded') : undefined} /> : null}
          </Row>
        ))}
      </Section>

      <Card outlined style={{ marginBottom: space.lg, padding: space.md }}>
        <Pressable onPress={() => setAgree(!agree)} accessibilityRole="checkbox" accessibilityState={{ checked: agree }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <Checkbox.Android status={agree ? 'checked' : 'unchecked'} onPress={() => setAgree(!agree)} color={colors.primary} />
            <Text style={[font.sub, { flex: 1, color: colors.text, paddingTop: 8 }]}>{t('I confirm these details are correct and the documents are mine. I agree to the GoTrip partner terms.')}</Text>
          </Row>
        </Pressable>
      </Card>
      <Text style={[font.small, { textAlign: 'center' }]}>{t('Verification usually takes up to 24 hours. You can add vehicles meanwhile.')}</Text>
    </Screen>
  );
}
