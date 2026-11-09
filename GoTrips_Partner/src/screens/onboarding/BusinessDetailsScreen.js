import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Button, Input, Loading, ProgressSteps, Row, Screen, Section } from '../../components/ui';
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
  const [tried, setTried] = useState(false);
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
  // Same rules as the server: district, city, full address and a 6-digit PIN are required.
  const errors = {
    district: !f.district && t('Choose your district'),
    city: f.city.trim().length < 2 && t('Enter your city or town'),
    address: f.address.trim().length < 5 && t('Enter your office or parking address'),
    pincode: !/^\d{6}$/.test(f.pincode) && t('Enter a 6-digit PIN code'),
    whatsappPhone: f.whatsappPhone && f.whatsappPhone.length !== 10 && t('Enter a 10-digit number'),
    alternatePhone: f.alternatePhone && f.alternatePhone.length !== 10 && t('Enter a 10-digit number'),
  };
  const valid = !Object.values(errors).some(Boolean);
  const err = (k) => (tried ? errors[k] || undefined : undefined);

  const save = async () => {
    setTried(true);
    if (!valid) return toast(t('Please fix the highlighted fields'), 'error');
    setBusy(true);
    try {
      await partnerApi.updateProfile({ ...f, city: f.city.trim(), address: f.address.trim(), businessName: f.businessName.trim() || null, pincode: f.pincode, whatsappPhone: f.whatsappPhone || null, alternatePhone: f.alternatePhone || null });
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
    <Screen title={editing ? t("Business details") : t("Partner registration")} back={!!editing} right={!editing && <Button title={t("Log out")} variant="ghost" small onPress={logout} />} footer={<Button title={editing ? t("Save") : t("Continue")} onPress={save} loading={busy} />}>
      {!editing && <ProgressSteps steps={progressSteps(onboarding)} current="details" />}
      {!editing && (
        <>
          <Text style={font.h1}>{t("Business details")}</Text>
          <Text style={[font.sub, { marginTop: 4, marginBottom: 16 }]}>{t("Where you work and how customers can reach you. Fields marked * are required.")}</Text>
        </>
      )}
      <Section title={t('Business')} icon="business">
        <Input label={t('Business / fleet name')} value={f.businessName} onChangeText={set('businessName')} placeholder={t('e.g. Hills Car Rentals')} hint={t('Optional. Leave empty if you work in your own name.')} />
      </Section>
      <Section title={t('Location')} icon="location" subtitle={t('Customers search by location, so choose your main area.')}>
        <DistrictSelect required value={f.district} onChange={set('district')} error={err('district')} />
        <Input label={t('City / town')} required value={f.city} onChangeText={set('city')} placeholder={t('e.g. Nagaon')} error={err('city')} />
        <Input label={t('Full address')} required value={f.address} onChangeText={set('address')} placeholder={t('Office / parking address')} error={err('address')} multiline />
        <Input label={t('PIN code')} required value={f.pincode} onChangeText={(v) => set('pincode')(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} error={err('pincode')} style={{ maxWidth: 200 }} />
      </Section>
      <Section title={t('Contact numbers')} icon="call" subtitle={t('Optional. Only if different from your login number.')}>
        <Input label={t('WhatsApp number')} prefix="+91" value={f.whatsappPhone} onChangeText={(v) => set('whatsappPhone')(v.replace(/\D/g, '').slice(-10))} keyboardType="phone-pad" error={err('whatsappPhone')} />
        <Input label={t('Alternate phone')} prefix="+91" value={f.alternatePhone} onChangeText={(v) => set('alternatePhone')(v.replace(/\D/g, '').slice(-10))} keyboardType="phone-pad" error={err('alternatePhone')} />
      </Section>
    </Screen>
  );
}
