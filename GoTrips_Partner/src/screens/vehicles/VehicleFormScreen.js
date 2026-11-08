import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Chips, Input, Notice, Row, Screen, Section, Select, Stepper, ToggleRow } from '../../components/ui';
import { DistrictSelect } from '../../components/fields';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useCaps } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { font } from '../../theme';
import { VEHICLE_LABELS } from '../../utils/format';
import { t } from '../../i18n';

const CLASSES = Object.entries(VEHICLE_LABELS).map(([value, label]) => ({ value, label }));
const PASSENGER = ['hatchback', 'sedan', 'suv', 'muv', 'van', 'mini_bus', 'bus', 'auto', 'bike'];
const FUEL = ['petrol', 'diesel', 'cng', 'electric', 'hybrid'].map((v) => ({ value: v, label: v.toUpperCase() === 'CNG' ? 'CNG' : v[0].toUpperCase() + v.slice(1) }));
const FEATURES = ['Music system', 'Carrier on roof', 'First-aid kit', 'GPS', 'Child seat', 'Push-back seats', 'Charging point'].map((v) => ({ value: v, label: v }));
const n = (v) => (v === '' || v == null ? null : Number(v));

/** Add or edit a vehicle (params.vehicle for edit). */
export default function VehicleFormScreen({ navigation, route }) {
  const v = route.params?.vehicle;
  const caps = useCaps();
  const toast = useToast();
  const [f, setF] = useState({
    vehicleClass: v?.vehicleClass || null,
    make: v?.make || '',
    model: v?.model || '',
    year: v?.year ? String(v.year) : '',
    color: v?.color || '',
    registrationNumber: v?.registrationNumber || '',
    seats: v?.seats || 4,
    loadCapacityKg: v?.loadCapacityKg ? String(v.loadCapacityKg) : '',
    fuelType: v?.fuelType || null,
    hasAc: v?.hasAc ?? true,
    features: v?.features || [],
    description: v?.description || '',
    forTrips: v ? v.forTrips : caps.trips && !caps.rentals,
    forRental: v ? v.forRental : caps.rentals,
    forGoods: v ? v.forGoods : caps.goods && !caps.trips,
    rentalPricePerDay: v?.rental?.pricePerDay ? String(v.rental.pricePerDay) : '',
    rentalPricePerHour: v?.rental?.pricePerHour ? String(v.rental.pricePerHour) : '',
    rentalDriverOption: v?.rental?.driverOption || 'both',
    securityDeposit: v?.rental?.securityDeposit ? String(v.rental.securityDeposit) : '',
    rentalDistrict: v?.rental?.district || null,
    rentalCity: v?.rental?.city || '',
    rentalAddress: v?.rental?.address || '',
    rentalTerms: v?.rental?.terms || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (val) => setF({ ...f, [k]: val });
  const passenger = PASSENGER.includes(f.vehicleClass);

  const problems = [
    !f.vehicleClass && 'vehicle type',
    !f.make.trim() && 'make',
    !f.model.trim() && 'model',
    f.registrationNumber.replace(/\s/g, '').length < 6 && 'registration number',
    !f.forTrips && !f.forRental && !f.forGoods && 'how you will use it',
    f.forRental && !f.rentalPricePerDay && !f.rentalPricePerHour && 'rent price',
    f.forRental && !f.rentalDistrict && 'rental location',
  ].filter(Boolean);

  const save = async () => {
    if (problems.length) return toast(t("Please add: {0}", [problems.join(', ')]), 'error');
    setBusy(true);
    const body = {
      vehicleClass: f.vehicleClass,
      make: f.make.trim(),
      model: f.model.trim(),
      year: n(f.year),
      color: f.color.trim() || null,
      registrationNumber: f.registrationNumber,
      seats: passenger || f.forTrips ? f.seats : null,
      loadCapacityKg: n(f.loadCapacityKg),
      fuelType: f.fuelType,
      hasAc: f.hasAc,
      features: f.features,
      description: f.description.trim() || null,
      forTrips: !!f.forTrips,
      forRental: !!f.forRental,
      forGoods: !!f.forGoods,
      ...(f.forRental
        ? { rentalPricePerDay: n(f.rentalPricePerDay), rentalPricePerHour: n(f.rentalPricePerHour), rentalDriverOption: f.rentalDriverOption, securityDeposit: n(f.securityDeposit), rentalDistrict: f.rentalDistrict, rentalCity: f.rentalCity.trim() || null, rentalAddress: f.rentalAddress.trim() || null, rentalTerms: f.rentalTerms.trim() || null }
        : {}),
    };
    try {
      const r = v ? await vehicleApi.update(v.id, body) : await vehicleApi.create(body);
      if (v) {
        toast(r.meta?.resubmitted ? t("Saved. Sent for verification again.") : t("Vehicle updated"), 'success');
        navigation.goBack();
      } else {
        toast(t("Vehicle added. Now add photos and documents."), 'success');
        navigation.replace('VehicleDetail', { id: r.data.id, justAdded: true });
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={v ? t("Edit vehicle") : t("Add vehicle")} footer={<Button title={v ? t("Save changes") : t("Save & continue")} onPress={save} loading={busy} />}>
      {!v && <Notice tone="blue" icon="shield-checkmark" text={t(
        "After you add photos and documents, our team verifies the vehicle (usually within 24 hours). Then customers can see it."
      )} />}
      {v?.verificationStatus === 'approved' && <Notice text={t(
        "Changing registration number, type, make, model or year sends the vehicle for verification again."
      )} />}
      <Section title={t("Vehicle")} icon="car">
        <Select label={t("Vehicle type")} required value={f.vehicleClass} onChange={set('vehicleClass')} options={CLASSES} />
        <Row>
          <Input style={{ flex: 1 }} label={t("Make")} required value={f.make} onChangeText={set('make')} placeholder={t("e.g. Toyota")} />
          <Input style={{ flex: 1 }} label={t("Model")} required value={f.model} onChangeText={set('model')} placeholder={t("e.g. Innova")} />
        </Row>
        <Input label={t("Registration number")} required value={f.registrationNumber} onChangeText={(v) => set('registrationNumber')(v.toUpperCase())} placeholder={t("AS 01 AB 1234")} autoCapitalize="characters" />
        <Row>
          <Input style={{ flex: 1 }} label={t("Year")} value={f.year} onChangeText={(v) => set('year')(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" placeholder="2021" />
          <Input style={{ flex: 1 }} label={t("Colour")} value={f.color} onChangeText={set('color')} placeholder={t("White")} />
        </Row>
        {(passenger || f.forTrips) && <Stepper label={t("Passenger seats")} sub={t("Excluding driver")} value={f.seats} onChange={set('seats')} min={1} max={60} />}
        {!passenger && f.vehicleClass && <Input label={t("Load capacity (kg)")} value={f.loadCapacityKg} onChangeText={(v) => set('loadCapacityKg')(v.replace(/\D/g, ''))} keyboardType="number-pad" />}
        <Chips label={t("Fuel")} options={FUEL} value={f.fuelType} onChange={set('fuelType')} />
        <ToggleRow title={t("Air conditioned (AC)")} value={f.hasAc} onChange={set('hasAc')} />
        <Chips label={t("Extras")} multiple options={FEATURES} value={f.features} onChange={set('features')} />
        <Input label={t("Description (optional)")} value={f.description} onChangeText={set('description')} multiline placeholder={t("Anything customers should know")} />
      </Section>

      <Section title={t("How will you use it?")} icon="options">
        {caps.trips && <ToggleRow title={t("Trips with passengers")} sub={t("Create start & return trips with this vehicle")} value={f.forTrips} onChange={set('forTrips')} />}
        {caps.rentals && <ToggleRow title={t("Rent it out")} sub={t("Show in the rental marketplace")} value={f.forRental} onChange={set('forRental')} />}
        {caps.goods && <ToggleRow title={t("Goods transport")} sub={t("Carry goods for customers")} value={f.forGoods} onChange={set('forGoods')} />}
      </Section>

      {f.forRental && (
        <Section title={t("Rental details")} icon="key">
          <Row>
            <Input style={{ flex: 1 }} label={t("Rent per day")} prefix="₹" value={f.rentalPricePerDay} onChangeText={(v) => set('rentalPricePerDay')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
            <Input style={{ flex: 1 }} label={t("Rent per hour")} prefix="₹" value={f.rentalPricePerHour} onChangeText={(v) => set('rentalPricePerHour')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          </Row>
          <Chips
            label={t("Driver")}
            options={[
              { value: 'self_drive', label: 'Self drive' },
              { value: 'with_driver', label: 'With driver' },
              { value: 'both', label: 'Both' },
            ]}
            value={f.rentalDriverOption}
            onChange={set('rentalDriverOption')}
          />
          <Input label={t("Security deposit (optional)")} prefix="₹" value={f.securityDeposit} onChangeText={(v) => set('securityDeposit')(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <DistrictSelect label={t("Available in district")} required value={f.rentalDistrict} onChange={set('rentalDistrict')} />
          <Input label={t("City / area")} value={f.rentalCity} onChangeText={set('rentalCity')} placeholder={t("e.g. Guwahati")} />
          <Input label={t("Pickup address (optional)")} value={f.rentalAddress} onChangeText={set('rentalAddress')} placeholder={t("e.g. Near Ganeshguri flyover")} />
          <Input label={t("Rental terms (optional)")} value={f.rentalTerms} onChangeText={set('rentalTerms')} multiline placeholder={t("e.g. ID proof needed, fuel not included")} />
          <Text style={font.small}>{t(
            "Tip: open the vehicle after saving and tap “Use my current location” to show it on the map."
          )}</Text>
        </Section>
      )}
    </Screen>
  );
}
