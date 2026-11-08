import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, Notice, Screen } from '../../components/ui';
import { DateField, ImageField, toIsoDate } from '../../components/fields';
import { partnerApi, vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { font } from '../../theme';

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
      toast('Document uploaded', 'success');
      navigation.goBack();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={r.label} footer={<Button title="Upload" icon="cloud-upload" onPress={save} loading={busy} disabled={!ready} />}>
      {d?.status === 'rejected' && <Notice tone="red" title="Please upload again" text={d.rejectionReason} />}
      <Text style={[font.sub, { marginBottom: 16 }]}>{r.hint || 'Place the document on a flat surface and make sure all text is readable.'}</Text>
      <ImageField label={r.requiresBack ? 'Front side' : 'Photo of document'} required value={front} url={d?.frontUrl} onChange={setFront} />
      {r.requiresBack && <ImageField label="Back side" required value={back} url={d?.backUrl} onChange={setBack} />}
      {r.requiresNumber && <Input label={`${r.label} number`} required value={number} onChangeText={setNumber} autoCapitalize="characters" />}
      {r.requiresExpiry && <DateField label="Valid till (expiry date)" required value={expiry} onChange={setExpiry} minimumDate={new Date()} />}
    </Screen>
  );
}
