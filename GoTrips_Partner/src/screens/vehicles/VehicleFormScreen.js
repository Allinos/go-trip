import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Chips, ChoiceCards, Input, Loading, Notice, Row, Screen, Section, Segmented, Select, Stepper, ToggleRow } from '../../components/ui';
import { DistrictSelect } from '../../components/fields';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useCaps } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { font, space } from '../../theme';
import { BODY_TYPES, BODY_TYPE_KEYS, CLASS_ICON, VEHICLE_CATEGORIES, VEHICLE_LABELS, categoryOf } from '../../utils/format';
import { t } from '../../i18n';

const MANUFACTURERS = {
  passenger: ['Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Toyota', 'Kia', 'Honda', 'Renault', 'Force Motors', 'Ashok Leyland', 'Eicher', 'Bajaj', 'TVS', 'Hero', 'Royal Enfield'],
  commercial: ['Tata Motors', 'Ashok Leyland', 'Mahindra', 'Eicher', 'BharatBenz', 'Force Motors', 'Maruti Suzuki', 'Piaggio', 'Bajaj', 'Isuzu', 'SML Isuzu'],
};
const OTHER = '__other';
/** Default and maximum seats (excluding the driver) for each passenger vehicle type. */
const SEATS = { hatchback: [4, 4], sedan: [4, 4], suv: [6, 7], muv: [6, 7], van: [9, 12], mini_bus: [20, 30], bus: [40, 60], auto: [3, 3], bike: [1, 1], other: [4, 60] };
const FUEL = [['petrol', 'Petrol'], ['diesel', 'Diesel'], ['cng', 'CNG'], ['electric', 'Electric'], ['hybrid', 'Hybrid']].map(([value, label]) => ({ value, label }));
const COLOURS = ['White', 'Silver', 'Grey', 'Black', 'Red', 'Blue', 'Brown', 'Yellow', 'Green', 'Orange'].map((v) => ({ value: v, label: v }));
const FEATURES = {
  passenger: ['Music system', 'Carrier on roof', 'First-aid kit', 'GPS', 'Child seat', 'Push-back seats', 'Charging point'],
  commercial: ['GPS tracking', 'Tarpaulin cover', 'Loading help', 'Hydraulic tail lift', 'Goods insurance', 'Ropes & straps'],
};
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 2 - 1990 }, (_, i) => String(thisYear + 1 - i)).map((y) => ({ value: y, label: y }));
const REG_RE = [/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/, /^\d{2}BH\d{4}[A-Z]{1,2}$/];
const cleanReg = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
const n = (v) => (v === '' || v == null ? null : Number(v));
const digits = (v) => v.replace(/\D/g, '');

/** Add or edit a vehicle (params.vehicle for edit). The form adapts to the vehicle category. */
export default function VehicleFormScreen({ navigation, route }) {
  const v = route.params?.vehicle;
  const caps = useCaps();
  const toast = useToast();
  const [allowed, setAllowed] = useState(null);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  const initialCategory = v ? categoryOf(v) : null;
  const knownMake = (cat, make) => !make || MANUFACTURERS[cat || 'passenger'].includes(make);
  const [f, setF] = useState(() => ({
    category: initialCategory,
    vehicleClass: v?.vehicleClass || null,
    makeChoice: v ? (knownMake(initialCategory, v.make) ? v.make : OTHER) : null,
    makeOther: v && !knownMake(initialCategory, v.make) ? v.make : '',
    model: v?.model || '',
    year: v?.year ? String(v.year) : null,
    color: v?.color || null,
    registrationNumber: v?.registrationNumber || '',
    seats: v?.seats || 4,
    loadValue: v?.loadCapacityKg ? String(v.loadCapacityKg >= 1000 ? v.loadCapacityKg / 1000 : v.loadCapacityKg) : '',
    loadUnit: v?.loadCapacityKg && v.loadCapacityKg < 1000 ? 'kg' : 'tonne',
    bodyType: v?.bodyType || null,
    cargoLengthFt: v?.cargoLengthFt ? String(v.cargoLengthFt) : '',
    fuelType: v?.fuelType || null,
    hasAc: v?.hasAc ?? true,
    features: v?.features || [],
    description: v?.description || '',
    forTrips: v ? v.forTrips : caps.trips,
    forRental: v ? v.forRental : caps.rentals,
    forGoods: v ? v.forGoods : false,
    rentalPricePerDay: v?.rental?.pricePerDay ? String(v.rental.pricePerDay) : '',
    rentalPricePerHour: v?.rental?.pricePerHour ? String(v.rental.pricePerHour) : '',
    rentalDriverOption: v?.rental?.driverOption || 'both',
    securityDeposit: v?.rental?.securityDeposit ? String(v.rental.securityDeposit) : '',
    rentalDistrict: v?.rental?.district || null,
    rentalCity: v?.rental?.city || '',
    rentalAddress: v?.rental?.address || '',
    rentalTerms: v?.rental?.terms || '',
  }));
  const set = (k) => (val) => setF((x) => ({ ...x, [k]: val }));

  // Which categories this partner type may register comes from the server.
  useEffect(() => {
    vehicleApi
      .requirements()
      .then((r) => {
        const cats = r.data.categories?.length ? r.data.categories : ['passenger'];
        setAllowed(cats);
        setF((x) => (x.category ? x : { ...x, category: cats.includes('commercial') && caps.goods ? 'commercial' : cats[0], forGoods: cats.includes('commercial') && caps.goods }));
      })
      .catch((e) => {
        setAllowed(['passenger']);
        toast(errorMessage(e), 'error');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goods = f.category === 'commercial';
  const cat = VEHICLE_CATEGORIES[f.category || 'passenger'];
  const [, maxSeats] = SEATS[f.vehicleClass] || [4, 60];
  const make = f.makeChoice === OTHER ? f.makeOther.trim() : f.makeChoice || '';
  const reg = cleanReg(f.registrationNumber);
  const loadKg = f.loadValue ? Math.round(Number(f.loadValue) * (f.loadUnit === 'tonne' ? 1000 : 1)) : null;

  const changeCategory = (c) =>
    setF((x) => ({
      ...x,
      category: c,
      vehicleClass: VEHICLE_CATEGORIES[c].classes.includes(x.vehicleClass) && x.vehicleClass !== 'other' ? x.vehicleClass : null,
      makeChoice: x.makeChoice && (x.makeChoice === OTHER || MANUFACTURERS[c].includes(x.makeChoice)) ? x.makeChoice : null,
      features: x.features.filter((ft) => FEATURES[c].includes(ft)),
      forGoods: c === 'commercial' && caps.goods,
    }));
  const changeClass = (c) => setF((x) => ({ ...x, vehicleClass: c, seats: !goods && SEATS[c] ? Math.min(SEATS[c][0], SEATS[c][1]) : x.seats }));

  const errors = useMemo(
    () => ({
      category: !f.category && t('Choose the vehicle category'),
      vehicleClass: !f.vehicleClass && t('Choose the vehicle type'),
      make: !make && t('Choose the manufacturer'),
      model: !f.model.trim() && t('Enter the model, e.g. {0}', [goods ? 'Ace Gold' : 'Innova Crysta']),
      registrationNumber: !reg ? t('Enter the registration number') : !REG_RE.some((re) => re.test(reg)) ? t('Check the number. Format: AS 01 AB 1234') : null,
      load: goods && (!loadKg ? t('Enter the load capacity') : loadKg < 50 ? t('At least 50 kg') : loadKg > 60000 ? t('At most 60 tonnes') : null),
      cargoLengthFt: goods && f.cargoLengthFt && (Number(f.cargoLengthFt) < 3 || Number(f.cargoLengthFt) > 80) && t('Between 3 and 80 ft'),
      usage: !f.forTrips && !f.forRental && !f.forGoods && t('Choose at least one way to use this vehicle'),
      rentPrice: f.forRental && !f.rentalPricePerDay && !f.rentalPricePerHour && t('Enter a price per day or per hour'),
      rentalDistrict: f.forRental && !f.rentalDistrict && t('Choose where the vehicle is available'),
    }),
    [f, make, reg, loadKg, goods]
  );
  const err = (k) => (tried ? errors[k] || undefined : undefined);

  const save = async () => {
    setTried(true);
    const first = Object.values(errors).find(Boolean);
    if (first) return toast(first, 'error');
    setBusy(true);
    const body = {
      category: f.category,
      vehicleClass: f.vehicleClass,
      make,
      model: f.model.trim(),
      year: n(f.year),
      color: f.color || null,
      registrationNumber: reg,
      fuelType: f.fuelType,
      features: f.features,
      description: f.description.trim() || null,
      forTrips: !!f.forTrips,
      forRental: !!f.forRental,
      forGoods: !!f.forGoods,
      ...(goods ? { loadCapacityKg: loadKg, bodyType: f.bodyType, cargoLengthFt: n(f.cargoLengthFt), seats: null } : { seats: f.seats, hasAc: f.hasAc, loadCapacityKg: null }),
      ...(f.forRental
        ? { rentalPricePerDay: n(f.rentalPricePerDay), rentalPricePerHour: n(f.rentalPricePerHour), rentalDriverOption: f.rentalDriverOption, securityDeposit: n(f.securityDeposit), rentalDistrict: f.rentalDistrict, rentalCity: f.rentalCity.trim() || null, rentalAddress: f.rentalAddress.trim() || null, rentalTerms: f.rentalTerms.trim() || null }
        : {}),
    };
    try {
      const r = v ? await vehicleApi.update(v.id, body) : await vehicleApi.create(body);
      if (v) {
        toast(r.meta?.resubmitted ? t('Saved. Sent for verification again.') : t('Vehicle updated'), 'success');
        navigation.goBack();
      } else {
        toast(t('Vehicle added. Now add photos and documents.'), 'success');
        navigation.replace('VehicleDetail', { id: r.data.id, justAdded: true });
      }
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) return <Loading full />;

  return (
    <Screen
      title={v ? t('Edit vehicle') : t('Add vehicle')}
      subtitle={v ? `${v.make} ${v.model} · ${v.registrationNumber}` : t('Step 1 of 2 · details')}
      footer={<Button title={v ? t('Save changes') : t('Save & add documents')} icon={v ? 'checkmark' : 'arrow-forward'} onPress={save} loading={busy} />}
    >
      {!v && <Notice tone="blue" icon="shield-checkmark" text={t('After you add photos and documents, our team verifies the vehicle (usually within 24 hours). Then customers can see it.')} />}
      {v?.verificationStatus === 'approved' && <Notice text={t('Changing the registration number, category, type, manufacturer, model or year sends the vehicle for verification again.')} />}

      {allowed.length > 1 && (
        <ChoiceCards
          label={t('Vehicle category')}
          required
          value={f.category}
          onChange={changeCategory}
          options={allowed.map((c) => ({ value: c, label: c === 'commercial' ? 'Goods vehicle' : 'Passenger vehicle', sub: c === 'commercial' ? 'Carries goods · load capacity' : 'Carries people · seats', icon: VEHICLE_CATEGORIES[c].icon }))}
        />
      )}

      <Section title={t('Vehicle details')} icon={goods ? 'cube' : 'car'} subtitle={allowed.length === 1 ? t(cat.label) : undefined}>
        <Select label={t('Vehicle type')} required value={f.vehicleClass} onChange={changeClass} error={err('vehicleClass')} options={cat.classes.map((c) => ({ value: c, label: VEHICLE_LABELS[c], icon: CLASS_ICON[c] }))} />
        <Select
          label={t('Manufacturer')}
          required
          value={f.makeChoice}
          onChange={set('makeChoice')}
          error={err('make')}
          searchable
          options={[...MANUFACTURERS[f.category || 'passenger'].map((m) => ({ value: m, label: m })), { value: OTHER, label: t('Other (type the name)') }]}
          renderValue={(o) => (o.value === OTHER ? f.makeOther || t('Other') : o.label)}
        />
        {f.makeChoice === OTHER && <Input label={t('Manufacturer name')} required value={f.makeOther} onChangeText={set('makeOther')} error={err('make')} autoCapitalize="words" />}
        <Input label={t('Vehicle model')} required value={f.model} onChangeText={set('model')} placeholder={goods ? t('e.g. Ace Gold, LPT 1109') : t('e.g. Innova Crysta, Swift Dzire')} error={err('model')} autoCapitalize="words" />
        <Select label={t('Manufacturing year')} value={f.year} onChange={set('year')} options={YEARS} placeholder={t('Year')} icon="calendar-outline" />
        <Select label={t('Colour')} value={f.color} onChange={set('color')} options={COLOURS} placeholder={t('Colour')} icon="color-palette-outline" />
        <Input
          label={t('Vehicle registration number')}
          required
          value={f.registrationNumber}
          onChangeText={(x) => set('registrationNumber')(x.toUpperCase())}
          placeholder="AS 01 AB 1234"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={14}
          error={err('registrationNumber')}
          hint={t('As printed on the RC. Spaces are optional.')}
        />
        <Chips label={t('Fuel type')} options={FUEL} value={f.fuelType} onChange={set('fuelType')} />
      </Section>

      {goods ? (
        <Section title={t('Load & body')} icon="barbell" subtitle={t('Customers choose a vehicle by how much it can carry.')}>
          <Row style={{ alignItems: 'flex-start' }} gap={12}>
            <Input
              style={{ flex: 1 }}
              label={t('Load capacity')}
              required
              value={f.loadValue}
              onChangeText={(x) => set('loadValue')(f.loadUnit === 'tonne' ? x.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').slice(0, 5) : digits(x).slice(0, 5))}
              keyboardType="decimal-pad"
              suffix={f.loadUnit === 'tonne' ? t('tonnes') : 'kg'}
              error={err('load')}
              hint={loadKg && !errors.load ? t('= {0} kg', [loadKg.toLocaleString('en-IN')]) : undefined}
            />
            <Segmented style={{ width: 130, marginTop: 6 }} value={f.loadUnit} onChange={(u) => setF((x) => ({ ...x, loadUnit: u, loadValue: '' }))} options={[{ value: 'kg', label: 'kg' }, { value: 'tonne', label: 't' }]} />
          </Row>
          <Chips label={t('Body type')} options={BODY_TYPE_KEYS.map((b) => ({ value: b, label: BODY_TYPES[b] }))} value={f.bodyType} onChange={set('bodyType')} />
          <Input label={t('Cargo length (optional)')} value={f.cargoLengthFt} onChangeText={(x) => set('cargoLengthFt')(digits(x).slice(0, 2))} keyboardType="number-pad" suffix="ft" error={err('cargoLengthFt')} style={{ maxWidth: 220 }} />
          <Chips label={t('Extras')} multiple options={FEATURES.commercial.map((x) => ({ value: x, label: x }))} value={f.features} onChange={set('features')} />
        </Section>
      ) : (
        <Section title={t('Seating & comfort')} icon="people">
          <Stepper label={t('Seating capacity')} sub={t('Passenger seats, excluding the driver')} value={f.seats} onChange={set('seats')} min={1} max={maxSeats} />
          <ToggleRow title={t('Air conditioned (AC)')} value={f.hasAc} onChange={set('hasAc')} icon="snow" />
          <Chips label={t('Extras')} multiple options={FEATURES.passenger.map((x) => ({ value: x, label: x }))} value={f.features} onChange={set('features')} />
        </Section>
      )}

      <Section title={t('How will you use it?')} icon="options">
        {caps.trips && (
          <ToggleRow
            title={goods ? t('Goods trips') : t('Seat-sharing trips')}
            sub={goods ? t('Publish routes; customers hire the vehicle to carry goods') : t('Publish start & return trips; passengers book seats')}
            value={f.forTrips}
            onChange={set('forTrips')}
          />
        )}
        {goods && caps.goods && <ToggleRow title={t('Goods orders')} sub={t('See customers who need goods moved')} value={f.forGoods} onChange={set('forGoods')} />}
        {caps.rentals && <ToggleRow title={t('Rent it out')} sub={t('Show in the rental marketplace')} value={f.forRental} onChange={set('forRental')} />}
        {err('usage') ? <Text style={[font.small, { color: '#B91C1C', marginBottom: space.sm }]}>{err('usage')}</Text> : null}
      </Section>

      {f.forRental && (
        <Section title={t('Rental details')} icon="key">
          <Row style={{ alignItems: 'flex-start' }} gap={12}>
            <Input style={{ flex: 1 }} label={t('Rent per day')} prefix="₹" value={f.rentalPricePerDay} onChangeText={(x) => set('rentalPricePerDay')(digits(x))} keyboardType="number-pad" error={err('rentPrice')} />
            <Input style={{ flex: 1 }} label={t('Rent per hour')} prefix="₹" value={f.rentalPricePerHour} onChangeText={(x) => set('rentalPricePerHour')(digits(x))} keyboardType="number-pad" />
          </Row>
          <Segmented
            label={t('Driver')}
            value={f.rentalDriverOption}
            onChange={set('rentalDriverOption')}
            options={[
              { value: 'self_drive', label: 'Self drive' },
              { value: 'with_driver', label: 'With driver' },
              { value: 'both', label: 'Both' },
            ]}
          />
          <Input label={t('Security deposit (optional)')} prefix="₹" value={f.securityDeposit} onChangeText={(x) => set('securityDeposit')(digits(x))} keyboardType="number-pad" />
          <DistrictSelect label={t('Available in district')} required value={f.rentalDistrict} onChange={set('rentalDistrict')} error={err('rentalDistrict')} />
          <Input label={t('City / area')} value={f.rentalCity} onChangeText={set('rentalCity')} placeholder={t('e.g. Guwahati')} />
          <Input label={t('Pickup address (optional)')} value={f.rentalAddress} onChangeText={set('rentalAddress')} placeholder={t('e.g. Near Ganeshguri flyover')} />
          <Input label={t('Rental terms (optional)')} value={f.rentalTerms} onChangeText={set('rentalTerms')} multiline placeholder={t('e.g. ID proof needed, fuel not included')} />
          <Text style={[font.small, { marginBottom: space.md }]}>{t('Tip: open the vehicle after saving and tap “Use my current location” to show it on the map.')}</Text>
        </Section>
      )}

      <Section title={t('Description')} icon="document-text">
        <Input label={t('Description (optional)')} value={f.description} onChangeText={set('description')} multiline maxLength={1000} placeholder={goods ? t('e.g. Covered body, suitable for furniture and cement') : t('Anything customers should know')} />
      </Section>
      <View style={{ height: 8 }} />
    </Screen>
  );
}
