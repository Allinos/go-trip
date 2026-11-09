import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, Notice, Row, Screen, Section, ToggleRow } from '../../components/ui';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { BODY_TYPES, capacityText, categoryOf, fullDate, loadText, rupees, titleCase, VEHICLE_CATEGORIES, VEHICLE_LABELS } from '../../utils/format';
import { useCaps } from '../../context/AuthContext';
import { confirm } from '../../utils/confirm';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

export default function VehicleDetailScreen({ navigation, route }) {
  const { id, justAdded } = route.params;
  const toast = useToast();
  const caps = useCaps();
  const { data: v, error, loading, reload, refresh, refreshing } = useApi(() => vehicleApi.get(id), [id], { cacheKey: `vehicle:${id}` });
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading full />;
  if (error) return <Screen title={t("Vehicle")}><ErrorView message={error} onRetry={reload} /></Screen>;

  const run = async (key, fn, msg) => {
    setBusy(key);
    try {
      await fn();
      if (msg) toast(msg, 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const addPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 8 - v.photos.length, quality: 0.7 });
    if (r.canceled) return;
    run('photos', () => vehicleApi.addPhotos(v.id, r.assets.map((a) => a.uri)), t('Photos added'));
  };
  const removePhoto = async (i) => (await confirm(t("Remove photo?"), '', { okText: 'Remove', destructive: true })) && run('photo', () => vehicleApi.removePhoto(v.id, i));
  const setRentalLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return toast(t("Location permission needed"), 'error');
    setBusy('loc');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await vehicleApi.update(v.id, { rentalLat: pos.coords.latitude, rentalLng: pos.coords.longitude });
      toast(t("Rental location saved"), 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  const remove = async () => (await confirm(t("Remove this vehicle?"), t("It will be hidden from customers."), { okText: 'Remove', destructive: true })) && run('del', async () => (await vehicleApi.remove(v.id), navigation.goBack()), t('Vehicle removed'));

  const goods = categoryOf(v) === 'commercial';
  const missingDocs = v.documents.filter((d) => d.requirement.isRequired && (!d.document || d.document.status === 'rejected'));
  return (
    <Screen title={`${v.make} ${v.model}`} refreshing={refreshing} onRefresh={refresh} right={v.verificationStatus !== 'suspended' && <Button small variant="ghost" icon="create-outline" title={t("Edit")} onPress={() => navigation.navigate('VehicleForm', { vehicle: v })} />}>
      {v.verificationStatus === 'pending' && (
        <Notice tone={missingDocs.length || !v.photos.length ? 'amber' : 'blue'} icon="time" title={justAdded ? t("Almost done!") : t("Waiting for verification")} text={missingDocs.length || !v.photos.length ? t(
          "Add photos and the required documents below so our team can verify this vehicle."
        ) : t("Our team is checking this vehicle. You will get a notification.")} />
      )}
      {v.verificationStatus === 'rejected' && <Notice tone="red" icon="alert-circle" title={t("Needs changes")} text={t(
        "{0}. Fix it and save or re-upload documents to resubmit.",
        [v.rejectionReason]
      )} />}
      {v.verificationStatus === 'approved' && <Notice tone="green" icon="checkmark-circle" title={t("Verified")} text={t("This vehicle is visible to customers when switched ON.")} />}
      {v.verificationStatus === 'suspended' && <Notice tone="red" title={t("Suspended")} text={v.rejectionReason || t("Contact support.")} />}

      <Section title={t("Photos ({0}/8)", [v.photos.length])} icon="images">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {v.photos.map((p, i) => (
            <Pressable key={p} onLongPress={() => removePhoto(i)} onPress={() => removePhoto(i)}>
              <CachedImage uri={p} style={{ width: 140, height: 100, borderRadius: 10 }} />
            </Pressable>
          ))}
          {v.photos.length < 8 && (
            <Pressable onPress={addPhotos} style={{ width: 140, height: 100, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={busy === 'photos' ? 'hourglass' : 'add'} size={28} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{busy === 'photos' ? t("Uploading…") : t("Add photos")}</Text>
            </Pressable>
          )}
        </ScrollView>
        <Text style={[font.small, { marginTop: 6 }]}>{t("Add front, side, back and inside photos. Tap a photo to remove it.")}</Text>
      </Section>

      <Section title={t("Documents")} icon="document-text" subtitle={missingDocs.length ? t("{0} required document(s) missing", [missingDocs.length]) : t("All required documents uploaded")}>
        {v.documents.map(({ requirement: r, document: d }, i) => (
          <Pressable key={r.docType} onPress={() => navigation.navigate('DocumentUpload', { requirement: r, document: d, scope: 'vehicle', vehicleId: v.id })} accessibilityRole="button" style={({ pressed }) => [{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.divider }, pressed && { opacity: 0.6 }]}>
            <Row>
              <Ionicons name={d ? (d.status === 'rejected' ? 'alert-circle' : 'checkmark-circle') : r.isRequired ? 'cloud-upload-outline' : 'add-circle-outline'} size={22} color={d ? (d.status === 'rejected' ? colors.primaryDark : colors.green) : r.isRequired ? colors.primary : colors.faint} />
              <View style={{ flex: 1 }}>
                <Text style={font.body}>
                  {r.label}
                  {!r.isRequired && <Text style={font.small}>{" "}{t("(optional)")}</Text>}
                </Text>
                <Text style={font.small}>{d ? (d.status === 'rejected' ? d.rejectionReason : d.expiryDate ? t("Valid till {0}", [fullDate(d.expiryDate)]) : t("Uploaded")) : t("Tap to upload")}</Text>
              </View>
              {d ? <Badge status={d.status} text={d.status === 'pending' ? t("In review") : undefined} /> : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
            </Row>
          </Pressable>
        ))}
      </Section>

      <Section title={t("Details")} icon="information-circle">
        <KV label={t("Category")} value={t(VEHICLE_CATEGORIES[goods ? 'commercial' : 'passenger'].label)} />
        <KV label={t("Registration")} value={v.registrationNumber} />
        <KV label={t("Type")} value={VEHICLE_LABELS[v.vehicleClass]} />
        <KV label={t("Manufacturer / model")} value={`${v.make} ${v.model}`} />
        <KV label={t("Year / colour")} value={[v.year, v.color].filter(Boolean).join(' · ') || '—'} />
        {goods ? (
          <>
            <KV label={t("Load capacity")} value={loadText(v.loadCapacityKg)} />
            {v.bodyType ? <KV label={t("Body type")} value={BODY_TYPES[v.bodyType]} /> : null}
            {v.cargoLengthFt ? <KV label={t("Cargo length")} value={`${v.cargoLengthFt} ft`} /> : null}
            <KV label={t("Fuel")} value={titleCase(v.fuelType) || '—'} />
          </>
        ) : (
          <>
            <KV label={t("Seating capacity")} value={v.seats ? t("{0} seats", [v.seats]) : '—'} />
            <KV label={t("Fuel / AC")} value={`${titleCase(v.fuelType) || '—'} · ${v.hasAc ? 'AC' : t('Non-AC')}`} />
          </>
        )}
        {v.features?.length ? <KV label={t("Extras")} value={v.features.map((x) => t(x)).join(', ')} /> : null}
        <KV label={t("Used for")} value={[v.forTrips && (goods ? t('Goods trips') : t('Seat-sharing trips')), v.forRental && t('Rental'), v.forGoods && t('Goods orders')].filter(Boolean).join(', ')} />
        <KV label={t("Trips created")} value={v.tripCount} />
      </Section>

      {v.verificationStatus !== 'suspended' && (
        <Section title={t("Availability")} icon="power">
          <ToggleRow title={v.isAvailable ? t("Vehicle is ON") : t("Vehicle is OFF")} sub={t("Turn OFF when the vehicle is in the garage or busy")} value={v.isAvailable} onChange={(isAvailable) => run('av', () => vehicleApi.availability(v.id, { isAvailable }))} />
          {v.forRental && <ToggleRow title={v.rentalAvailable ? t("Available for rent") : t("Not available for rent")} sub={t("Customers see this on your rental listing")} value={v.rentalAvailable} onChange={(rentalAvailable) => run('av', () => vehicleApi.availability(v.id, { rentalAvailable }))} />}
        </Section>
      )}

      {v.forRental && v.rental && (
        <Section title={t("Rental listing")} icon="key">
          <View>
            <KV label={t("Rent")} value={[v.rental.pricePerDay && `${rupees(v.rental.pricePerDay)}/day`, v.rental.pricePerHour && `${rupees(v.rental.pricePerHour)}/hour`].filter(Boolean).join(' · ')} />
            <KV label={t("Driver")} value={titleCase(v.rental.driverOption)} />
            <KV label={t("Location")} value={[v.rental.city, v.rental.district].filter(Boolean).join(', ')} />
            <KV label={t("On map")} value={v.rental.lat ? 'Yes' : 'Not set'} />
            <Button small variant="secondary" icon="locate" title={t("Use my current location")} loading={busy === 'loc'} onPress={setRentalLocation} style={{ marginTop: 8, marginBottom: 12 }} />
          </View>
        </Section>
      )}

      {caps.trips && v.verificationStatus === 'approved' && v.forTrips && v.isAvailable && <Button title={t("Create a trip with this vehicle")} icon="add-circle" onPress={() => navigation.navigate('TripForm', { tripType: 'start', vehicleId: v.id })} style={{ marginBottom: 12 }} />}
      {caps.trips && v.verificationStatus === 'approved' && !v.forTrips && (
        <Notice
          tone="blue"
          icon="map"
          title={t("Not used for trips")}
          text={t("Turn on trips for this vehicle to use it in Create trip.")}
          action={<Button small variant="secondary" title={t("Use for trips")} loading={busy === 'trips'} onPress={() => run('trips', () => vehicleApi.update(v.id, { forTrips: true }), t('This vehicle can now be used for trips'))} style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
        />
      )}
      <Button title={t("Remove vehicle")} icon="trash" variant="danger" onPress={remove} loading={busy === 'del'} />
    </Screen>
  );
}
