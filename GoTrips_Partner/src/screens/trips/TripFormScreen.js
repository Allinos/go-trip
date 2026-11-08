import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Chips, Input, Loading, Notice, Row, Screen, Section, Select, Stepper, ToggleRow } from '../../components/ui';
import { DateField, PlaceInput } from '../../components/fields';
import { tripApi, vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { rupees, VEHICLE_LABELS } from '../../utils/format';
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

export default function TripFormScreen({ navigation, route }) {
  const { trip, returnOf, copyOf } = route.params || {};
  const editing = !!trip;
  const toast = useToast();
  const [vehicles, setVehicles] = useState(null);
  const [type, setType] = useState(trip?.tripType || copyOf?.tripType || (returnOf ? 'return' : route.params?.tripType || 'start'));
  const [vehicleId, setVehicleId] = useState(trip?.vehicle?.id || returnOf?.vehicle?.id || copyOf?.vehicle?.id || null);
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

  useEffect(() => {
    vehicleApi
      .list({ usage: 'trips' })
      .then((r) => {
        const usable = r.data.filter((v) => v.verificationStatus === 'approved' && v.isAvailable);
        setVehicles({ usable, all: r.data });
        if (!vehicleId && usable.length === 1) setVehicleId(usable[0].id);
      })
      .catch((e) => toast(errorMessage(e), 'error'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const vehicle = vehicles?.all.find((v) => v.id === vehicleId);
  useEffect(() => {
    if (vehicle?.seats && seats > vehicle.seats) setSeats(vehicle.seats);
  }, [vehicle]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStop = (i, patch) => setStops(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addStop = () => setStops([...stops.slice(0, -1), emptyStop(), stops[stops.length - 1]]);
  const removeStop = (i) => setStops(stops.filter((_, j) => j !== i));
  const swap = () => setStops([...stops].reverse().map((s) => ({ ...s, fareFromStart: '' })));

  const problems = useMemo(() => {
    const p = [];
    if (!vehicleId) p.push('Choose a vehicle');
    if (stops.some((s) => s.placeName.trim().length < 2)) p.push('Fill in all places');
    if (!price || Number(price) < 0) p.push('Enter price per seat');
    if (departure < new Date()) p.push('Departure must be in the future');
    return p;
  }, [vehicleId, stops, price, departure]);

  const save = async () => {
    if (problems.length) return toast(problems[0], 'error');
    setBusy(true);
    const body = {
      departureAt: departure.toISOString(),
      totalSeats: seats,
      pricePerSeat: Number(price),
      acceptsParcels: parcels,
      notes: notes.trim() || null,
      ...(routeLocked
        ? {}
        : {
            stops: stops.map((s, i) => ({
              placeName: s.placeName.trim(),
              district: s.district || null,
              lat: s.lat ?? null,
              lng: s.lng ?? null,
              fareFromStart: i === 0 ? 0 : i === stops.length - 1 ? Number(price) : stopFares && s.fareFromStart ? Number(s.fareFromStart) : null,
            })),
          }),
    };
    try {
      let r;
      if (editing) r = await tripApi.update(trip.id, body);
      else if (returnOf && type === 'return') r = await tripApi.create({ ...body, vehicleId, tripType: 'return', parentTripId: returnOf.id });
      else r = await tripApi.create({ ...body, vehicleId, tripType: type });
      toast(editing ? t("Trip updated") : t("Trip published! Passengers can now book."), 'success');
      navigation.replace('TripDetail', { id: r.data.id });
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!vehicles) return <Loading full />;
  if (!vehicles.usable.length && !editing)
    return (
      <Screen title={t("Create trip")}>
        <Notice
          tone="amber"
          icon="car"
          title={t("No verified vehicle yet")}
          text={vehicles.all.length ? t(
            "Your vehicles are waiting for verification, or switched OFF / not set for trips. You can create trips once a vehicle is verified."
          ) : t("Add a vehicle first. After our team verifies it you can create trips.")}
        />
        <Button title={vehicles.all.length ? t("View my vehicles") : t("Add a vehicle")} onPress={() => navigation.navigate(vehicles.all.length ? 'Vehicles' : 'VehicleForm')} />
      </Screen>
    );

  const seatEarnings = Number(price || 0) * seats;
  return (
    <Screen title={editing ? t("Edit trip") : type === 'return' ? t("Create return trip") : t("Create trip")} footer={
      <View>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={font.small}>{t("ESTIMATED EARNINGS (ALL SEATS)")}</Text>
          <Text style={[font.h2, { color: colors.primary }]}>{rupees(seatEarnings)}</Text>
        </Row>
        <Button title={editing ? t("Save changes") : t("Publish trip")} icon="paper-plane" onPress={save} loading={busy} />
      </View>
    }>
      {!editing && !returnOf && (
        <Chips
          label={t("Trip type")}
          options={[
            { value: 'start', label: 'Start trip (going out)' },
            { value: 'return', label: 'Return trip (coming back)' },
          ]}
          value={type}
          onChange={setType}
          hint={type === 'return' ? t(
            "Coming back from your destination? Passengers on the way can book your empty seats."
          ) : t("You are travelling today or later and have empty seats.")}
        />
      )}
      {returnOf && <Notice tone="blue" icon="swap-horizontal" title={t("Return trip")} text={t(
        "Return of {0} → {1}. The route is reversed for you — just set the time.",
        [returnOf.originName, returnOf.destinationName]
      )} />}

      <Section title={t("Vehicle")} icon="car">
        {editing ? (
          <Card>
            <Text style={font.h3}>{`${trip.vehicle.make} ${trip.vehicle.model}`}</Text>
            <Text style={font.small}>{trip.vehicle.registrationNumber}</Text>
          </Card>
        ) : (
          <Select
            value={vehicleId}
            onChange={setVehicleId}
            placeholder={t("Choose your vehicle")}
            options={vehicles.usable.map((v) => ({ value: v.id, label: `${v.make} ${v.model}`, sub: `${v.registrationNumber} · ${VEHICLE_LABELS[v.vehicleClass]} · ${v.seats || '?'} seats` }))}
          />
        )}
      </Section>

      <Section title={t("Route")} icon="git-commit" right={!routeLocked && <Pressable onPress={swap} hitSlop={10}><Row gap={4}><Ionicons name="swap-vertical" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '600' }}>{t("Swap")}</Text></Row></Pressable>}>
        {routeLocked && <Notice text={t("The route cannot change after passengers have sent requests.")} />}
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }}>
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
                {stopFares && !first && !last && (
                  <Input prefix="₹" placeholder={t("Fare from start to here")} value={s.fareFromStart} onChangeText={(trip) => setStop(i, { fareFromStart: trip.replace(/\D/g, '') })} keyboardType="number-pad" />
                )}
              </View>
            );
          })}
          {!routeLocked && stops.length < 15 && <Button small variant="ghost" icon="add-circle-outline" title={t("Add a stop on the way")} onPress={addStop} style={{ alignSelf: 'flex-start' }} />}
        </Card>
        <Text style={[font.small, { marginTop: 6 }]}>{t("Adding towns on the way helps more passengers find your trip.")}</Text>
      </Section>

      <Section title={t("When")} icon="calendar">
        <DateField label={t("Departure date & time")} mode="datetime" value={departure} onChange={setDeparture} minimumDate={new Date()} />
      </Section>

      <Section title={t("Seats & price")} icon="cash">
        <Stepper label={t("Seats available")} sub={vehicle?.seats ? t("Your vehicle has {0} seats (excluding driver)", [vehicle.seats]) : t("Excluding driver")} value={seats} onChange={setSeats} min={1} max={vehicle?.seats || 50} />
        <Input label={t("Price per seat (full route)")} required prefix="₹" value={price} onChangeText={(trip) => setPrice(trip.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 350" />
        {stops.length > 2 && <ToggleRow title={t("Different fare for each stop")} sub={t("Passengers getting off early pay less")} value={stopFares} onChange={setStopFares} />}
        <ToggleRow title={t("I can carry parcels")} value={parcels} onChange={setParcels} />
        <Input label={t("Notes for passengers (optional)")} value={notes} onChangeText={setNotes} placeholder={t("e.g. AC car, 1 bag per person, pickup near bus stand")} multiline maxLength={500} />
      </Section>
    </Screen>
  );
}
