import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Input, Loading, Notice, Row, Screen, Section, Segmented, Stepper, ToggleRow } from '../../components/ui';
import { DateField, PlaceInput } from '../../components/fields';
import { tripApi, vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { capacityText, categoryOf, CLASS_ICON, loadText, rupees, VEHICLE_LABELS } from '../../utils/format';
import { t } from '../../i18n';

const emptyStop = () => ({ placeName: '', district: null, lat: null, lng: null, fareFromStart: '' });
const nextHour = () => {
  const d = new Date(Date.now() + 2 * 3600_000);
  d.setMinutes(0, 0, 0);
  return d;
};

/**
 * Create / edit a trip.
 *  - params.tripType: 'start' | 'return'
 *  - params.returnOf: outbound trip → one-tap return trip (reversed route)
 *  - params.trip: existing trip to edit
 */
/** Repeat a trip: same time of day, on the next day that is still ahead of now. */
function sameTimeNextDay(iso) {
  const d = new Date(iso);
  do d.setDate(d.getDate() + 1);
  while (d.getTime() < Date.now() + 30 * 60_000);
  return d;
}

const styles = {
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.card },
  vehicleOn: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.primarySoft },
};

export default function TripFormScreen({ navigation, route }) {
  const { trip, returnOf, copyOf } = route.params || {};
  const editing = !!trip;
  const toast = useToast();
  const [vehicles, setVehicles] = useState(null);
  const [type, setType] = useState(trip?.tripType || copyOf?.tripType || (returnOf ? 'return' : route.params?.tripType || 'start'));
  const [vehicleId, setVehicleId] = useState(trip?.vehicle?.id || returnOf?.vehicle?.id || copyOf?.vehicle?.id || route.params?.vehicleId || null);
  const [capacity, setCapacity] = useState(String(trip?.capacityKg ?? returnOf?.capacityKg ?? copyOf?.capacityKg ?? ''));
  const [fixing, setFixing] = useState(null);
  const [stops, setStops] = useState(
    trip || copyOf
      ? (trip || copyOf).stops.map((s) => ({ placeName: s.placeName, district: s.district, lat: s.lat, lng: s.lng, fareFromStart: s.fareFromStart != null ? String(s.fareFromStart) : '' }))
      : returnOf
        ? [...returnOf.stops].reverse().map((s) => ({ placeName: s.placeName, district: s.district, lat: s.lat, lng: s.lng, fareFromStart: '' }))
        : [emptyStop(), emptyStop()]
  );
  const [departure, setDeparture] = useState(trip ? new Date(trip.departureAt) : returnOf ? new Date(new Date(returnOf.departureAt).getTime() + 6 * 3600_000) : copyOf ? sameTimeNextDay(copyOf.departureAt) : nextHour());
  const [seats, setSeats] = useState(trip?.totalSeats || returnOf?.totalSeats || copyOf?.totalSeats || 4);
  const [price, setPrice] = useState(String(trip?.pricePerSeat ?? returnOf?.pricePerSeat ?? copyOf?.pricePerSeat ?? ''));
  const [parcels, setParcels] = useState(trip?.acceptsParcels ?? returnOf?.acceptsParcels ?? copyOf?.acceptsParcels ?? false);
  const [notes, setNotes] = useState(trip?.notes || copyOf?.notes || '');
  const [stopFares, setStopFares] = useState(stops.some((s, i) => i > 0 && i < stops.length - 1 && s.fareFromStart));
  const [busy, setBusy] = useState(false);
  const routeLocked = editing && trip.bookings?.some((b) => ['pending', 'accepted'].includes(b.status));

  /**
   * All the partner's vehicles are loaded (not only the ones marked for trips) so the form can say why a
   * verified vehicle is not selectable and fix it in one tap, instead of silently leaving it out.
   */
  const loadVehicles = () =>
    vehicleApi
      .list()
      .then((r) => {
        const all = r.data.filter((v) => v.verificationStatus !== 'suspended');
        const usable = all.filter((v) => v.verificationStatus === 'approved' && v.isAvailable && v.forTrips);
        setVehicles({ usable, all, blocked: all.filter((v) => !usable.includes(v)) });
        setVehicleId((cur) => (cur && usable.some((v) => v.id === cur) ? cur : usable.length === 1 ? usable[0].id : editing ? cur : null));
      })
      .catch((e) => {
        setVehicles({ usable: [], all: [], blocked: [] });
        toast(errorMessage(e), 'error');
      });
  useEffect(() => {
    loadVehicles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const whyBlocked = (v) =>
    v.verificationStatus === 'pending' ? [t('Waiting for verification'), null] : v.verificationStatus === 'rejected' ? [t('Verification failed — fix and resubmit'), 'open'] : !v.isAvailable ? [t('Switched OFF'), 'on'] : !v.forTrips ? [t('Not set for trips'), 'trips'] : [t('Not available'), null];
  const fix = async (v, action) => {
    if (action === 'open') return navigation.navigate('VehicleDetail', { id: v.id });
    setFixing(v.id);
    try {
      if (action === 'on') await vehicleApi.availability(v.id, { isAvailable: true });
      if (action === 'trips') await vehicleApi.update(v.id, { forTrips: true });
      await loadVehicles();
      setVehicleId(v.id);
      toast(t('{0} is ready for trips', [`${v.make} ${v.model}`]), 'success');
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setFixing(null);
    }
  };

  const vehicle = vehicles?.all.find((v) => v.id === vehicleId) || (editing ? trip.vehicle : null);
  const goods = editing ? trip.kind === 'goods' : vehicle ? categoryOf(vehicle) === 'commercial' : false;
  useEffect(() => {
    if (!goods && vehicle?.seats && seats > vehicle.seats) setSeats(vehicle.seats);
    if (goods && vehicle?.loadCapacityKg && !capacity) setCapacity(String(vehicle.loadCapacityKg));
  }, [vehicle]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStop = (i, patch) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStop = () => setStops([...stops.slice(0, -1), emptyStop(), stops[stops.length - 1]]);
  const removeStop = (i) => setStops(stops.filter((_, j) => j !== i));
  const swap = () => setStops([...stops].reverse().map((s) => ({ ...s, fareFromStart: '' })));

  const problems = useMemo(() => {
    const p = [];
    if (!vehicleId) p.push(t('Choose a vehicle'));
    if (stops.some((s) => s.placeName.trim().length < 2)) p.push(t('Fill in all places'));
    if (!price || Number(price) < 0) p.push(goods ? t('Enter the hire price') : t('Enter price per seat'));
    if (goods && (!Number(capacity) || Number(capacity) < 50)) p.push(t('Enter the load capacity (at least 50 kg)'));
    if (goods && vehicle?.loadCapacityKg && Number(capacity) > vehicle.loadCapacityKg) p.push(t('This vehicle can carry up to {0}', [loadText(vehicle.loadCapacityKg)]));
    if (departure < new Date()) p.push(t('Departure must be in the future'));
    return p;
  }, [vehicleId, stops, price, departure, goods, capacity, vehicle]);

  const save = async () => {
    if (problems.length) return toast(problems[0], 'error');
    setBusy(true);
    const body = {
      departureAt: departure.toISOString(),
      ...(goods ? { capacityKg: Number(capacity) } : { totalSeats: seats, acceptsParcels: parcels }),
      pricePerSeat: Number(price),
      notes: notes.trim() || null,
      ...(routeLocked
        ? {}
        : {
            stops: stops.map((s, i) => ({
              placeName: s.placeName.trim(),
              district: s.district || null,
              lat: s.lat ?? null,
              lng: s.lng ?? null,
              fareFromStart: i === 0 ? 0 : i === stops.length - 1 ? Number(price) : !goods && stopFares && s.fareFromStart ? Number(s.fareFromStart) : null,
            })),
          }),
    };
    try {
      let r;
      if (editing) r = await tripApi.update(trip.id, body);
      else if (returnOf && type === 'return') r = await tripApi.create({ ...body, vehicleId, tripType: 'return', parentTripId: returnOf.id });
      else r = await tripApi.create({ ...body, vehicleId, tripType: type });
      toast(editing ? t("Trip updated") : goods ? t("Trip published! Customers can now hire your vehicle.") : t("Trip published! Passengers can now book."), 'success');
      navigation.replace('TripDetail', { id: r.data.id });
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!vehicles) return <Loading full />;
  if (!vehicles.usable.length && !vehicles.blocked.length && !editing)
    return (
      <Screen title={t("Create trip")}>
        <Notice tone="amber" icon="car" title={t("Add a vehicle first")} text={t("After our team verifies it you can create trips.")} />
        <Button title={t("Add a vehicle")} icon="add" onPress={() => navigation.navigate('VehicleForm')} />
      </Screen>
    );

  const seatEarnings = Number(price || 0) * (goods ? 1 : seats);
  return (
    <Screen title={editing ? t("Edit trip") : type === 'return' ? t("Create return trip") : t("Create trip")} footer={
      <View>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={font.small}>{goods ? t("ESTIMATED EARNINGS (FULL HIRE)") : t("ESTIMATED EARNINGS (ALL SEATS)")}</Text>
          <Text style={[font.h2, { color: colors.primary }]}>{rupees(seatEarnings)}</Text>
        </Row>
        <Button title={editing ? t("Save changes") : t("Publish trip")} icon="paper-plane" onPress={save} loading={busy} disabled={!vehicleId} />
      </View>
    }>
      {!editing && !returnOf && (
        <Segmented
          label={t("Trip type")}
          options={[
            { value: 'start', label: 'Start trip', icon: 'arrow-forward' },
            { value: 'return', label: 'Return trip', icon: 'return-down-back' },
          ]}
          value={type}
          onChange={setType}
          hint={type === 'return' ? t("Coming back from your destination? Customers on the way can book your empty space.") : t("You are travelling today or later and have empty space.")}
        />
      )}
      {returnOf && <Notice tone="blue" icon="swap-horizontal" title={t("Return trip")} text={t(
        "Return of {0} → {1}. The route is reversed for you — just set the time.",
        [returnOf.originName, returnOf.destinationName]
      )} />}

      <Section title={t("Vehicle")} icon="car" subtitle={editing ? undefined : t("Only verified vehicles that are ON and set for trips can be chosen.")}>
        {editing ? (
          <Row>
            <Ionicons name={CLASS_ICON[trip.vehicle.vehicleClass] || 'car'} size={22} color={colors.primary} />
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <Text style={font.h3}>{`${trip.vehicle.make} ${trip.vehicle.model}`}</Text>
              <Text style={font.small}>{[trip.vehicle.registrationNumber, capacityText(trip.vehicle)].filter(Boolean).join(' · ')}</Text>
            </View>
          </Row>
        ) : (
          <View style={{ paddingBottom: 8 }}>
            {vehicles.usable.map((v) => {
              const on = v.id === vehicleId;
              return (
                <Pressable key={v.id} onPress={() => setVehicleId(v.id)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[styles.vehicle, on && styles.vehicleOn]}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.primary : colors.faint} />
                  <View style={{ flex: 1 }}>
                    <Text style={font.h3}>{`${v.make} ${v.model}`}</Text>
                    <Text style={font.small}>{[v.registrationNumber, VEHICLE_LABELS[v.vehicleClass], capacityText(v)].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {categoryOf(v) === 'commercial' && <Badge tone="gray" icon="cube" text={t('Goods')} />}
                </Pressable>
              );
            })}
            {vehicles.blocked.length > 0 && (
              <>
                <Text style={[font.label, { marginTop: vehicles.usable.length ? 8 : 0, marginBottom: 6 }]}>{t("Not available for trips")}</Text>
                {vehicles.blocked.map((v) => {
                  const [why, action] = whyBlocked(v);
                  return (
                    <View key={v.id} style={[styles.vehicle, { opacity: 0.95, backgroundColor: colors.surfaceVariant }]}>
                      <Ionicons name={CLASS_ICON[v.vehicleClass] || 'car'} size={20} color={colors.faint} />
                      <View style={{ flex: 1 }}>
                        <Text style={[font.body, { color: colors.sub }]}>{`${v.make} ${v.model} · ${v.registrationNumber}`}</Text>
                        <Text style={[font.small, { color: colors.amber }]}>{why}</Text>
                      </View>
                      {action && <Button small compact variant="ghost" loading={fixing === v.id} title={action === 'open' ? t('Open') : action === 'on' ? t('Switch ON') : t('Use for trips')} onPress={() => fix(v, action)} />}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </Section>

      <Section title={t("Route")} icon="git-commit" right={!routeLocked && <Pressable onPress={swap} hitSlop={10}><Row gap={4}><Ionicons name="swap-vertical" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '600' }}>{t("Swap")}</Text></Row></Pressable>}>
        {routeLocked && <Notice text={t("The route cannot change after passengers have sent requests.")} />}
        <View>
          {stops.map((s, i) => {
            const first = i === 0;
            const last = i === stops.length - 1;
            return (
              <View key={i}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <PlaceInput
                      label={first ? t("Starting from") : last ? t("Going to") : t("Stop {0}", [i])}
                      icon={first ? 'radio-button-on' : last ? 'location' : 'ellipse-outline'}
                      value={s.placeName}
                      onChange={(trip, meta) => !routeLocked && setStop(i, { placeName: trip, ...(meta || { district: null, lat: null, lng: null }) })}
                      placeholder={first ? t("e.g. Nagaon") : last ? t("e.g. Guwahati") : t("Town on the way")}
                    />
                  </View>
                  {!first && !last && !routeLocked && (
                    <Pressable onPress={() => removeStop(i)} style={{ paddingTop: 34 }} accessibilityLabel={t("Remove stop")}>
                      <Ionicons name="close-circle" size={24} color={colors.faint} />
                    </Pressable>
                  )}
                </Row>
                {!goods && stopFares && !first && !last && (
                  <Input prefix="₹" placeholder={t("Fare from start to here")} value={s.fareFromStart} onChangeText={(trip) => setStop(i, { fareFromStart: trip.replace(/\D/g, '') })} keyboardType="number-pad" />
                )}
              </View>
            );
          })}
          {!routeLocked && stops.length < 15 && <Button small variant="ghost" icon="add-circle-outline" title={t("Add a stop on the way")} onPress={addStop} style={{ alignSelf: 'flex-start' }} />}
        </View>
        <Text style={[font.small, { marginTop: 6, marginBottom: 12 }]}>{goods ? t("Adding towns on the way helps more customers find your vehicle.") : t("Adding towns on the way helps more passengers find your trip.")}</Text>
      </Section>

      <Section title={t("When")} icon="calendar">
        <DateField label={t("Departure date & time")} mode="datetime" value={departure} onChange={setDeparture} minimumDate={new Date()} />
      </Section>

      {goods ? (
        <Section title={t("Load & price")} icon="cash" subtitle={t("The customer hires the whole vehicle for this route.")}>
          <Input label={t("Load capacity available")} required suffix="kg" value={capacity} onChangeText={(x) => setCapacity(x.replace(/\D/g, '').slice(0, 5))} keyboardType="number-pad" hint={vehicle?.loadCapacityKg ? t("Your vehicle can carry up to {0}", [loadText(vehicle.loadCapacityKg)]) : undefined} />
          <Input label={t("Hire price for the full route")} required prefix="₹" value={price} onChangeText={(x) => setPrice(x.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 4500" hint={t("Customers pay you directly. GoTrip takes no commission.")} />
          <Input label={t("Notes for customers (optional)")} value={notes} onChangeText={setNotes} placeholder={t("e.g. Covered body, loading help available, no hazardous goods")} multiline maxLength={500} />
        </Section>
      ) : (
        <Section title={t("Seats & price")} icon="cash">
          <Stepper label={t("Seats available")} sub={vehicle?.seats ? t("Your vehicle has {0} seats (excluding driver)", [vehicle.seats]) : t("Excluding driver")} value={seats} onChange={setSeats} min={1} max={vehicle?.seats || 50} />
          <Input label={t("Price per seat (full route)")} required prefix="₹" value={price} onChangeText={(trip) => setPrice(trip.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 350" />
          {stops.length > 2 && <ToggleRow title={t("Different fare for each stop")} sub={t("Passengers getting off early pay less")} value={stopFares} onChange={setStopFares} />}
          <ToggleRow title={t("I can carry parcels")} value={parcels} onChange={setParcels} />
          <Input label={t("Notes for passengers (optional)")} value={notes} onChangeText={setNotes} placeholder={t("e.g. AC car, 1 bag per person, pickup near bus stand")} multiline maxLength={500} />
        </Section>
      )}
    </Screen>
  );
}
