import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chips, Input, Loading, Notice, ProgressSteps, Screen, Section, Stepper, ToggleRow, Row } from '../../components/ui';
import { DateField, DistrictSelect, toIsoDate } from '../../components/fields';
import { meApi, partnerApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useAuth, useCatalog } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdvance, progressSteps } from './flow';
import { colors, font } from '../../theme';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

const LICENSE_TYPES = ['LMV', 'MCWG', 'TRANS', 'HMV', 'HGMV', 'HPMV'].map((v) => ({ value: v, label: v }));
const VEHICLE_TYPES = [
  ['car', 'Car'], ['suv', 'SUV / MUV'], ['tempo_traveller', 'Tempo traveller'], ['bus', 'Bus'], ['pickup', 'Pickup'], ['truck', 'Truck'], ['auto', 'Auto'], ['bike', 'Bike'],
].map(([value, label]) => ({ value, label }));
const WORK_TYPES = [
  ['personal', 'Personal / family driver'], ['outstation', 'Outstation trips'], ['daily', 'Daily office drop'], ['commercial', 'Commercial / company'], ['event', 'Weddings & events'], ['airport', 'Airport / station'],
].map(([value, label]) => ({ value, label }));
const LANGS = ['Assamese', 'Hindi', 'English', 'Bengali', 'Bodo', 'Nepali'].map((v) => ({ value: v, label: v }));
const AVAIL = [
  ['full_time', 'Full time'], ['part_time', 'Part time'], ['on_call', 'On call'],
].map(([value, label]) => ({ value, label }));
const PAY_UNIT = [
  ['per_day', 'Per day'], ['per_month', 'Per month'], ['per_trip', 'Per trip'], ['per_hour', 'Per hour'],
].map(([value, label]) => ({ value, label }));

/** Driver marketplace profile — onboarding "details" step and Profile → Edit. */
export default function DriverDetailsScreen({ navigation, route }) {
  const editing = route.params?.edit;
  const { user, setUser, onboarding, logout, setOnboardingState } = useAuth();
  const { districts } = useCatalog();
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const toast = useToast();
  const advance = useAdvance(navigation);

  useEffect(() => {
    partnerApi
      .driverProfile()
      .then(({ data: p }) =>
        setF({
          headline: p.headline || '',
          bio: p.bio || '',
          hasPriorExperience: p.hasPriorExperience ?? true,
          experienceYears: p.experienceYears || 1,
          experienceDetails: p.experienceDetails || '',
          licenseNumber: p.licenseNumber || '',
          licenseTypes: p.licenseTypes || [],
          licenseExpiry: p.licenseExpiry ? new Date(p.licenseExpiry) : null,
          vehicleTypes: p.vehicleTypes || [],
          canDriveAutomatic: !!p.canDriveAutomatic,
          hasOwnVehicle: !!p.hasOwnVehicle,
          languages: p.languages?.length ? p.languages : ['Assamese'],
          serviceAreas: p.serviceAreas || [],
          workTypes: p.workTypes || [],
          availability: p.availability || 'full_time',
          expectedPayMin: p.expectedPayMin != null ? String(p.expectedPayMin) : '',
          expectedPayMax: p.expectedPayMax != null ? String(p.expectedPayMax) : '',
          payUnit: p.payUnit || 'per_day',
          education: p.education || '',
          district: p.district || null,
          city: p.city || '',
        })
      )
      .catch((e) => toast(errorMessage(e), 'error'));
  }, [toast]);

  if (!f) return <Loading full />;
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const missing = [!f.licenseNumber.trim() && 'licence number', !f.vehicleTypes.length && 'vehicles you can drive', !f.district && 'district'].filter(Boolean);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (r.canceled) return;
    setPhotoBusy(true);
    try {
      const res = await meApi.photo(r.assets[0].uri);
      setUser(res.data);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    if (missing.length) return toast(t("Please add: {0}", [missing.join(', ')]), 'error');
    const min = f.expectedPayMin ? Number(f.expectedPayMin) : null;
    const max = f.expectedPayMax ? Number(f.expectedPayMax) : null;
    setBusy(true);
    try {
      const r = await partnerApi.saveDriverProfile({
        ...f,
        headline: f.headline.trim() || null,
        bio: f.bio.trim() || null,
        experienceDetails: f.experienceDetails.trim() || null,
        licenseNumber: f.licenseNumber.trim().toUpperCase(),
        licenseExpiry: toIsoDate(f.licenseExpiry),
        expectedPayMin: min,
        expectedPayMax: max ?? min,
        education: f.education.trim() || null,
        city: f.city.trim() || f.district,
      });
      if (editing) {
        setOnboardingState(r.data.onboarding);
        toast(t("Profile saved"), 'success');
        navigation.goBack();
      } else advance(r.data.onboarding);
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={editing ? t("Edit marketplace profile") : t("Partner registration")}
      back={!!editing}
      right={!editing && <Button title={t("Log out")} variant="ghost" small onPress={logout} />}
      footer={<Button title={editing ? t("Save profile") : t("Continue")} onPress={save} loading={busy} />}
    >
      {!editing && <ProgressSteps steps={progressSteps(onboarding)} current="details" />}
      {!editing && (
        <>
          <Text style={[font.h1, { marginTop: 8 }]}>{t("Your driver profile")}</Text>
          <Text style={[font.sub, { marginTop: 6, marginBottom: 16 }]}>{t(
            "Customers see this on the marketplace before calling you. A complete profile gets more calls."
          )}</Text>
        </>
      )}

      <Section title={t("About you")} icon="person-circle">
        <Row style={{ marginBottom: 16 }} gap={14}>
          <Pressable onPress={pickPhoto} accessibilityLabel={t("Change profile photo")}>
            {user?.photoUrl ? (
              <CachedImage uri={user.photoUrl} style={{ width: 76, height: 76, borderRadius: 38 }} />
            ) : (
              <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="camera" size={28} color={colors.primary} />
              </View>
            )}
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={font.h3}>{user?.fullName}</Text>
            <Button title={photoBusy ? t("Uploading…") : user?.photoUrl ? t("Change photo") : t("Add your photo")} small variant="secondary" onPress={pickPhoto} disabled={photoBusy} style={{ alignSelf: 'flex-start', marginTop: 6 }} />
          </View>
        </Row>
        <Input label={t("Headline")} value={f.headline} onChangeText={set('headline')} placeholder={t("e.g. Safe outstation driver, 8 years")} maxLength={120} />
        <Input label={t("About you")} value={f.bio} onChangeText={set('bio')} placeholder={t("Tell customers about your driving, routes you know, etc.")} multiline maxLength={1000} />
        <Chips label={t("Languages you speak")} multiple options={LANGS} value={f.languages} onChange={set('languages')} />
      </Section>

      <Section title={t("Experience")} icon="ribbon">
        <ToggleRow title={t("I have driving experience")} sub={t("Worked as a driver before")} value={f.hasPriorExperience} onChange={set('hasPriorExperience')} />
        {f.hasPriorExperience && (
          <>
            <Stepper label={t("Years of experience")} value={f.experienceYears} onChange={set('experienceYears')} min={1} max={50} />
            <Input label={t("Where have you worked?")} value={f.experienceDetails} onChangeText={set('experienceDetails')} placeholder={t("e.g. 5 years with ABC Travels, Guwahati")} multiline />
          </>
        )}
      </Section>

      <Section title={t("Driving licence")} icon="card">
        <Input label={t("Licence number")} required value={f.licenseNumber} onChangeText={set('licenseNumber')} placeholder={t("AS01 20150012345")} autoCapitalize="characters" />
        <Chips label={t("Licence class")} multiple options={LICENSE_TYPES} value={f.licenseTypes} onChange={set('licenseTypes')} hint={t("LMV = car/jeep, TRANS = commercial, HMV/HGMV = bus/truck")} />
        <DateField label={t("Licence valid till")} value={f.licenseExpiry} onChange={set('licenseExpiry')} minimumDate={new Date()} />
      </Section>

      <Section title={t("What you drive")} icon="car">
        <Chips label={t("Vehicles you can drive")} required multiple options={VEHICLE_TYPES} value={f.vehicleTypes} onChange={set('vehicleTypes')} />
        <ToggleRow title={t("Can drive automatic cars")} value={f.canDriveAutomatic} onChange={set('canDriveAutomatic')} />
        <ToggleRow title={t("I have my own vehicle")} value={f.hasOwnVehicle} onChange={set('hasOwnVehicle')} />
      </Section>

      <Section title={t("Work you want")} icon="briefcase">
        <Chips label={t("Type of work")} multiple options={WORK_TYPES} value={f.workTypes} onChange={set('workTypes')} />
        <Chips label={t("Availability")} options={AVAIL} value={f.availability} onChange={set('availability')} />
        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 6 }}>{t("Expected pay (₹)")}</Text>
        <Row>
          <Input style={{ flex: 1 }} placeholder={t("From")} value={f.expectedPayMin} onChangeText={(v) => set('expectedPayMin')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Input style={{ flex: 1 }} placeholder={t("To")} value={f.expectedPayMax} onChangeText={(v) => set('expectedPayMax')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
        </Row>
        <Chips options={PAY_UNIT} value={f.payUnit} onChange={set('payUnit')} />
        <Input label={t("Education (optional)")} value={f.education} onChangeText={set('education')} placeholder={t("e.g. 10th pass")} />
      </Section>

      <Section title={t("Location")} icon="location">
        <DistrictSelect required value={f.district} onChange={set('district')} />
        <Input label={t("City / town")} value={f.city} onChangeText={set('city')} placeholder={t("e.g. Guwahati")} />
        <Chips
          label={t("Other districts you can work in")}
          multiple
          options={(districts || []).filter((d) => d.name !== f.district).slice(0, 40).map((d) => ({ value: d.name, label: d.name }))}
          value={f.serviceAreas}
          onChange={set('serviceAreas')}
        />
      </Section>
      {missing.length > 0 && <Notice text={t("Still needed: {0}", [missing.join(', ')])} />}
    </Screen>
  );
}
