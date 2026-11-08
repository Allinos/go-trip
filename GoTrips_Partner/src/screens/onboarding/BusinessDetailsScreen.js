import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, Loading, ProgressSteps, Screen } from '../../components/ui';
import { DistrictSelect } from '../../components/fields';
import { partnerApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdvance, progressSteps } from './flow';
import { font } from '../../theme';
import { t } from '../../i18n';

/** Business / contact details. Used in onboarding and later from Account → Business details. */
export default function BusinessDetailsScreen({ navigation, route }) {
  const editing = route.params?.edit;
  const { onboarding, logout, setOnboardingState } = useAuth();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const advance = useAdvance(navigation);

  useEffect(() => {
    partnerApi
      .profile()
      .then((r) => setF({ businessName: r.data.businessName || '', district: r.data.district, city: r.data.city || '', address: r.data.address || '', pincode: r.data.pincode || '', whatsappPhone: (r.data.whatsappPhone || '').replace('+91', ''), alternatePhone: (r.data.alternatePhone || '').replace('+91', '') }))
      .catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);

  if (!f) return <Loading full />;
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const valid = f.district && f.city.trim().length >= 2 && (!f.pincode || /^\d{6}$/.test(f.pincode));

  const save = async () => {
    setBusy(true);
    try {
      await partnerApi.updateProfile({ ...f, businessName: f.businessName || null, pincode: f.pincode || null, whatsappPhone: f.whatsappPhone || null, alternatePhone: f.alternatePhone || null, address: f.address || null });
      const st = (await partnerApi.onboarding()).data;
      if (editing) {
        setOnboardingState(st);
        toast(t("Saved"), 'success');
        navigation.goBack();
      } else advance(st);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={editing ? t("Business details") : t("Partner registration")} back={!!editing} right={!editing && <Button title={t("Log out")} variant="ghost" small onPress={logout} />} footer={<Button title={editing ? t("Save") : t("Continue")} onPress={save} loading={busy} disabled={!valid} />}>
      {!editing && <ProgressSteps steps={progressSteps(onboarding)} current="details" />}
      {!editing && (
        <>
          <Text style={[font.h1, { marginTop: 8 }]}>{t("Where do you work?")}</Text>
          <Text style={[font.sub, { marginTop: 6, marginBottom: 20 }]}>{t("Customers search by location, so choose your main area.")}</Text>
        </>
      )}
      <Input label={t("Business / fleet name (optional)")} value={f.businessName} onChangeText={set('businessName')} placeholder={t("e.g. Hills Car Rentals")} />
      <DistrictSelect required value={f.district} onChange={set('district')} />
      <Input label={t("City / town")} required value={f.city} onChangeText={set('city')} placeholder={t("e.g. Nagaon")} />
      <Input label={t("Address (optional)")} value={f.address} onChangeText={set('address')} placeholder={t("Office / parking address")} />
      <Input label={t("PIN code (optional)")} value={f.pincode} onChangeText={(v) => set('pincode')(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} />
      <Input label={t("WhatsApp number (optional)")} prefix="+91" value={f.whatsappPhone} onChangeText={(v) => set('whatsappPhone')(v.replace(/\D/g, '').slice(-10))} keyboardType="phone-pad" hint={t("If different from your login number")} />
      <Input label={t("Alternate phone (optional)")} prefix="+91" value={f.alternatePhone} onChangeText={(v) => set('alternatePhone')(v.replace(/\D/g, '').slice(-10))} keyboardType="phone-pad" />
    </Screen>
  );
}
