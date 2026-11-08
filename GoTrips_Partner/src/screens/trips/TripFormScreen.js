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
export default function TripFormScreen({ navigation, route }) {
  const { trip, returnOf } = route.params || {};
  const editing = !!trip;
  const toast = useToast();
  const [vehicles, setVehicles] = useState(null);
  const [type, setType] = useState(trip?.tripType || (returnOf ? 'return' : route.params?.tripType || 'start'));
  const [vehicleId, setVehicleId] = useState(trip?.vehicle?.id || returnOf?.vehicle?.id || null);
  const [stops, setStops] = useState(
    trip
      ? trip.stops.map((s) => ({ ...s, fareFromStart: s.fareFromStart != null ? String(s.fareFromStart) : '' }))
      : returnOf
        ? [...returnOf.stops].reverse().map((s) => ({ placeName: s.placeName, district: s.district, lat: s.lat, lng: s.lng, fareFromStart: '' }))
        : [emptyStop(), emptyStop()]
  );
  const [departure, setDeparture] = useState(trip ? new Date(trip.departureAt) : returnOf ? new Date(new Date(returnOf.departureAt).getTime() + 6 * 3600_000) : nextHour());
  const [seats, setSeats] = useState(trip?.totalSeats || returnOf?.totalSeats || 4);
  const [price, setPrice] = useState(String(trip?.pricePerSeat ?? returnOf?.pricePerSeat ?? ''));
  const [parcels, setParcels] = useState(trip?.acceptsParcels ?? returnOf?.acceptsParcels ?? false);
  const [notes, setNotes] = useState(trip?.notes || '');
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
      toast(editing ? 'Trip updated' : 'Trip published! Passengers can now book.', 'success');
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
      <Screen title="Create trip">
        <Notice
          tone="amber"
          icon="car"
          title="No verified vehicle yet"
          text={vehicles.all.length ? 'Your vehicles are waiting for verification, or switched OFF / not set for trips. You can create trips once a vehicle is verified.' : 'Add a vehicle first. After our team verifies it you can create trips.'}
        />
        <Button title={vehicles.all.length ? 'View my vehicles' : 'Add a vehicle'} onPress={() => navigation.navigate(vehicles.all.length ? 'Vehicles' : 'VehicleForm')} />
      </Screen>
    );

  const seatEarnings = Number(price || 0) * seats;
  return (
    <Screen title={editing ? 'Edit trip' : type === 'return' ? 'Create return trip' : 'Create trip'} footer={
      <View>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={font.small}>ESTIMATED EARNINGS (ALL SEATS)</Text>
          <Text style={[font.h2, { color: colors.primary }]}>{rupees(seatEarnings)}</Text>
        </Row>
        <Button title={editing ? 'Save changes' : 'Publish trip'} icon="paper-plane" onPress={save} loading={busy} />
      </View>
    }>
      {!editing && !returnOf && (
        <Chips
          label="Trip type"
          options={[
            { value: 'start', label: 'Start trip (going out)' },
            { value: 'return', label: 'Return trip (coming back)' },
          ]}
          value={type}
          onChange={setType}
          hint={type === 'return' ? 'Coming back from your destination? Passengers on the way can book your empty seats.' : 'You are travelling today or later and have empty seats.'}
        />
      )}
      {returnOf && <Notice tone="blue" icon="swap-horizontal" title="Return trip" text={`Return of ${returnOf.originName} → ${returnOf.destinationName}. The route is reversed for you — just set the time.`} />}

      <Section title="Vehicle" icon="car">
        {editing ? (
          <Card>
            <Text style={font.h3}>{`${trip.vehicle.make} ${trip.vehicle.model}`}</Text>
            <Text style={font.small}>{trip.vehicle.registrationNumber}</Text>
          </Card>
        ) : (
          <Select
            value={vehicleId}
            onChange={setVehicleId}
            placeholder="Choose your vehicle"
            options={vehicles.usable.map((v) => ({ value: v.id, label: `${v.make} ${v.model}`, sub: `${v.registrationNumber} · ${VEHICLE_LABELS[v.vehicleClass]} · ${v.seats || '?'} seats` }))}
          />
        )}
      </Section>

      <Section title="Route" icon="git-commit" right={!routeLocked && <Pressable onPress={swap} hitSlop={10}><Row gap={4}><Ionicons name="swap-vertical" size={16} color={colors.primary} /><Text style={{ color: colors.primary, fontWeight: '600' }}>Swap</Text></Row></Pressable>}>
        {routeLocked && <Notice text="The route cannot change after passengers have sent requests." />}
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }}>
          {stops.map((s, i) => {
            const first = i === 0;
            const last = i === stops.length - 1;
            return (
              <View key={i}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <PlaceInput
                      label={first ? 'Starting from' : last ? 'Going to' : `Stop ${i}`}
                      icon={first ? 'radio-button-on' : last ? 'location' : 'ellipse-outline'}
                      value={s.placeName}
                      onChange={(t, meta) => !routeLocked && setStop(i, { placeName: t, ...(meta || { district: null, lat: null, lng: null }) })}
                      placeholder={first ? 'e.g. Nagaon' : last ? 'e.g. Guwahati' : 'Town on the way'}
                    />
                  </View>
                  {!first && !last && !routeLocked && (
                    <Pressable onPress={() => removeStop(i)} style={{ paddingTop: 34 }} accessibilityLabel="Remove stop">
                      <Ionicons name="close-circle" size={24} color={colors.faint} />
                    </Pressable>
                  )}
                </Row>
                {stopFares && !first && !last && (
                  <Input prefix="₹" placeholder="Fare from start to here" value={s.fareFromStart} onChangeText={(t) => setStop(i, { fareFromStart: t.replace(/\D/g, '') })} keyboardType="number-pad" />
                )}
              </View>
            );
          })}
          {!routeLocked && stops.length < 15 && <Button small variant="ghost" icon="add-circle-outline" title="Add a stop on the way" onPress={addStop} style={{ alignSelf: 'flex-start' }} />}
        </Card>
        <Text style={[font.small, { marginTop: 6 }]}>Adding towns on the way helps more passengers find your trip.</Text>
      </Section>

      <Section title="When" icon="calendar">
        <DateField label="Departure date & time" mode="datetime" value={departure} onChange={setDeparture} minimumDate={new Date()} />
      </Section>

      <Section title="Seats & price" icon="cash">
        <Stepper label="Seats available" sub={vehicle?.seats ? `Your vehicle has ${vehicle.seats} seats (excluding driver)` : 'Excluding driver'} value={seats} onChange={setSeats} min={1} max={vehicle?.seats || 50} />
        <Input label="Price per seat (full route)" required prefix="₹" value={price} onChangeText={(t) => setPrice(t.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="e.g. 350" />
        {stops.length > 2 && <ToggleRow title="Different fare for each stop" sub="Passengers getting off early pay less" value={stopFares} onChange={setStopFares} />}
        <ToggleRow title="I can carry parcels" value={parcels} onChange={setParcels} />
        <Input label="Notes for passengers (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. AC car, 1 bag per person, pickup near bus stand" multiline maxLength={500} />
      </Section>
    </Screen>
  );
}
