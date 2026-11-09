import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, Notice, Row, Screen, Section } from '../../components/ui';
import { DateField, ImageField, toIsoDate } from '../../components/fields';
import { partnerApi, vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { font } from '../../theme';
import { t } from '../../i18n';

/** Upload one document (partner or vehicle scope). */
export default function DocumentUploadScreen({ navigation, route }) {
  const { requirement: r, document: d, scope, vehicleId } = route.params;
  const { setOnboardingState } = useAuth();
  const toast = useToast();
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);
  const [number, setNumber] = useState(d?.docNumber || '');
  const [expiry, setExpiry] = useState(d?.expiryDate ? new Date(d.expiryDate) : null);
  const [busy, setBusy] = useState(false);

  const ready = (front || d) && (!r.requiresBack || back || d?.backUrl) && (!r.requiresNumber || number.trim()) && (!r.requiresExpiry || expiry);

  const save = async () => {
    setBusy(true);
    try {
      const fields = { docNumber: number.trim() || undefined, expiryDate: toIsoDate(expiry) || undefined };
      if (scope === 'vehicle') await vehicleApi.uploadDocument(vehicleId, r.docType, front, back, fields);
      else {
        const res = await partnerApi.uploadDocument(r.docType, front, back, fields);
        setOnboardingState(res.data.onboarding);
      }
      toast(t("Document uploaded"), 'success');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={r.label} footer={<Button title={t("Upload")} icon="cloud-upload" onPress={save} loading={busy} disabled={!ready} />}>
      {d?.status === 'rejected' && <Notice tone="red" title={t("Please upload again")} text={d.rejectionReason} />}
      <Notice tone="blue" icon="camera" text={r.hint || t("Place the document on a flat surface and make sure all text is readable.")} />
      <Section title={t("Photos")} icon="images" subtitle={r.requiresBack ? t("Both sides are required") : undefined}>
        {r.requiresBack ? (
          <Row style={{ alignItems: 'flex-start' }} gap={12}>
            <ImageField compact label={t("Front side")} required value={front} url={d?.frontUrl} onChange={setFront} />
            <ImageField compact label={t("Back side")} required value={back} url={d?.backUrl} onChange={setBack} />
          </Row>
        ) : (
          <ImageField label={t("Photo of document")} required value={front} url={d?.frontUrl} onChange={setFront} />
        )}
      </Section>
      {(r.requiresNumber || r.requiresExpiry) && (
        <Section title={t("Document details")} icon="create">
          {r.requiresNumber && <Input label={t("{0} number", [r.label])} required value={number} onChangeText={(v) => setNumber(v.toUpperCase())} autoCapitalize="characters" />}
          {r.requiresExpiry && <DateField label={t("Valid till (expiry date)")} required value={expiry} onChange={setExpiry} minimumDate={new Date()} />}
        </Section>
      )}
    </Screen>
  );
}
