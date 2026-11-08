import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Loading, ProgressSteps, Screen } from '../../components/ui';
import { partnerApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth, useCatalog } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdvance, progressSteps } from './flow';
import { colors, font, radius, space } from '../../theme';
import { paise } from '../../utils/format';
import { t } from '../../i18n';

const ICONS = { driver: 'person', taxi: 'car', rental: 'key', commercial: 'bus', steering: 'person', car: 'car', key: 'key', truck: 'bus' };

const capText = (c) =>
  [c.capabilities.driverProfile && 'Marketplace profile', c.capabilities.vehicles && 'List vehicles', c.capabilities.trips && 'Start & return trips', c.capabilities.rentals && 'Rent out vehicles'].filter(Boolean).join(' · ');

export default function CategoryScreen({ navigation }) {
  const { onboarding, logout } = useAuth();
  const { config, reloadCatalog } = useCatalog();
  const [selected, setSelected] = useState(onboarding?.category?.code || null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const advance = useAdvance(navigation);

  const save = async () => {
    setBusy(true);
    try {
      const r = await partnerApi.register({ categoryCode: selected });
      advance(r.data);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!config) {
    reloadCatalog();
    return <Loading full />;
  }

  return (
    <Screen title={t("Partner registration")} back={false} right={<Button title={t("Log out")} variant="ghost" small onPress={logout} />} footer={<Button title={t("Continue")} onPress={save} loading={busy} disabled={!selected} />}>
      <ProgressSteps steps={progressSteps(onboarding)} current="category" />
      <Text style={[font.h1, { marginTop: 8 }]}>{t("How will you work with GoTrip?")}</Text>
      <Text style={[font.sub, { marginTop: 6, marginBottom: 20 }]}>{t("Choose the option that best describes you.")}</Text>
      {config.categories.map((c) => {
        const on = selected === c.code;
        return (
          <Pressable key={c.code} onPress={() => setSelected(c.code)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ flexDirection: 'row', gap: 14, padding: space.lg, marginBottom: space.md, borderRadius: radius.lg, borderWidth: 2, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.card }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: on ? colors.primary : colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICONS[c.code] || ICONS[c.icon] || 'briefcase'} size={26} color={on ? '#fff' : colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={font.h3}>{c.name}</Text>
              <Text style={[font.sub, { marginTop: 2 }]}>{c.description}</Text>
              <Text style={[font.small, { marginTop: 6 }]}>{capText(c)}</Text>
              <Text style={{ marginTop: 6, fontWeight: '700', color: c.registrationFee ? colors.text : colors.green }}>
                {c.registrationFee ? t("Registration fee {0}{1}", [
                  paise(c.registrationFee),
                  c.feeValidityDays ? ` / ${c.feeValidityDays === 365 ? 'year' : `${c.feeValidityDays} days`}` : ''
                ]) : t("Free to join")}
              </Text>
            </View>
            {on && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
          </Pressable>
        );
      })}
    </Screen>
  );
}
