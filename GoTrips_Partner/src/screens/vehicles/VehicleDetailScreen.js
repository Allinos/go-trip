import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, ErrorView, KV, Loading, Notice, Row, Screen, Section, ToggleRow } from '../../components/ui';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { fullDate, rupees, titleCase, VEHICLE_LABELS } from '../../utils/format';

export default function VehicleDetailScreen({ navigation, route }) {
  const { id, justAdded } = route.params;
  const toast = useToast();
  const { data: v, error, loading, reload, refresh, refreshing } = useApi(() => vehicleApi.get(id), [id]);
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading full />;
  if (error) return <Screen title="Vehicle"><ErrorView message={error} onRetry={reload} /></Screen>;

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
    run('photos', () => vehicleApi.addPhotos(v.id, r.assets.map((a) => a.uri)), 'Photos added');
  };
  const removePhoto = (i) => Alert.alert('Remove photo?', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => run('photo', () => vehicleApi.removePhoto(v.id, i)) }]);
  const setRentalLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return toast('Location permission needed', 'error');
    setBusy('loc');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await vehicleApi.update(v.id, { rentalLat: pos.coords.latitude, rentalLng: pos.coords.longitude });
      toast('Rental location saved', 'success');
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };
  const remove = () =>
    Alert.alert('Remove this vehicle?', 'It will be hidden from customers.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run('del', async () => (await vehicleApi.remove(v.id), navigation.goBack()), 'Vehicle removed') },
    ]);

  const missingDocs = v.documents.filter((d) => d.requirement.isRequired && (!d.document || d.document.status === 'rejected'));
  return (
    <Screen title={`${v.make} ${v.model}`} refreshing={refreshing} onRefresh={refresh} right={v.verificationStatus !== 'suspended' && <Button small variant="ghost" icon="create-outline" title="Edit" onPress={() => navigation.navigate('VehicleForm', { vehicle: v })} />}>
      {v.verificationStatus === 'pending' && (
        <Notice tone={missingDocs.length || !v.photos.length ? 'amber' : 'blue'} icon="time" title={justAdded ? 'Almost done!' : 'Waiting for verification'} text={missingDocs.length || !v.photos.length ? 'Add photos and the required documents below so our team can verify this vehicle.' : 'Our team is checking this vehicle. You will get a notification.'} />
      )}
      {v.verificationStatus === 'rejected' && <Notice tone="red" icon="alert-circle" title="Needs changes" text={`${v.rejectionReason}. Fix it and save or re-upload documents to resubmit.`} />}
      {v.verificationStatus === 'approved' && <Notice tone="green" icon="checkmark-circle" title="Verified" text="This vehicle is visible to customers when switched ON." />}
      {v.verificationStatus === 'suspended' && <Notice tone="red" title="Suspended" text={v.rejectionReason || 'Contact support.'} />}

      <Section title={`Photos (${v.photos.length}/8)`} icon="images">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {v.photos.map((p, i) => (
            <Pressable key={p} onLongPress={() => removePhoto(i)} onPress={() => removePhoto(i)}>
              <Image source={{ uri: p }} style={{ width: 140, height: 100, borderRadius: 10 }} />
            </Pressable>
          ))}
          {v.photos.length < 8 && (
            <Pressable onPress={addPhotos} style={{ width: 140, height: 100, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={busy === 'photos' ? 'hourglass' : 'add'} size={28} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{busy === 'photos' ? 'Uploading…' : 'Add photos'}</Text>
            </Pressable>
          )}
        </ScrollView>
        <Text style={[font.small, { marginTop: 6 }]}>Add front, side, back and inside photos. Tap a photo to remove it.</Text>
      </Section>

      <Section title="Documents" icon="document-text">
        {v.documents.map(({ requirement: r, document: d }) => (
          <Card key={r.docType} style={{ marginBottom: 10 }} onPress={() => navigation.navigate('DocumentUpload', { requirement: r, document: d, scope: 'vehicle', vehicleId: v.id })}>
            <Row>
              <Ionicons name={d ? (d.status === 'rejected' ? 'alert-circle' : 'checkmark-circle') : 'cloud-upload-outline'} size={22} color={d ? (d.status === 'rejected' ? colors.primaryDark : colors.green) : colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={font.h3}>
                  {r.label}
                  {!r.isRequired && <Text style={font.small}> (optional)</Text>}
                </Text>
                <Text style={font.small}>{d ? (d.status === 'rejected' ? d.rejectionReason : d.expiryDate ? `Valid till ${fullDate(d.expiryDate)}` : 'Uploaded') : 'Tap to upload'}</Text>
              </View>
              {d && <Badge status={d.status} text={d.status === 'pending' ? 'In review' : undefined} />}
            </Row>
          </Card>
        ))}
      </Section>

      <Section title="Details" icon="information-circle">
        <Card>
          <KV label="Registration" value={v.registrationNumber} />
          <KV label="Type" value={VEHICLE_LABELS[v.vehicleClass]} />
          <KV label="Year / colour" value={[v.year, v.color].filter(Boolean).join(' · ') || '—'} />
          {v.seats ? <KV label="Seats" value={v.seats} /> : null}
          {v.loadCapacityKg ? <KV label="Load" value={`${v.loadCapacityKg} kg`} /> : null}
          <KV label="Fuel / AC" value={`${titleCase(v.fuelType) || '—'} · ${v.hasAc ? 'AC' : 'Non-AC'}`} />
          <KV label="Used for" value={[v.forTrips && 'Trips', v.forRental && 'Rental', v.forGoods && 'Goods'].filter(Boolean).join(', ')} />
          <KV label="Trips created" value={v.tripCount} />
        </Card>
      </Section>

      {v.verificationStatus !== 'suspended' && (
        <Section title="Availability" icon="power">
          <ToggleRow title={v.isAvailable ? 'Vehicle is ON' : 'Vehicle is OFF'} sub="Turn OFF when the vehicle is in the garage or busy" value={v.isAvailable} onChange={(isAvailable) => run('av', () => vehicleApi.availability(v.id, { isAvailable }))} />
          {v.forRental && <ToggleRow title={v.rentalAvailable ? 'Available for rent' : 'Not available for rent'} sub="Customers see this on your rental listing" value={v.rentalAvailable} onChange={(rentalAvailable) => run('av', () => vehicleApi.availability(v.id, { rentalAvailable }))} />}
        </Section>
      )}

      {v.forRental && v.rental && (
        <Section title="Rental listing" icon="key">
          <Card>
            <KV label="Rent" value={[v.rental.pricePerDay && `${rupees(v.rental.pricePerDay)}/day`, v.rental.pricePerHour && `${rupees(v.rental.pricePerHour)}/hour`].filter(Boolean).join(' · ')} />
            <KV label="Driver" value={titleCase(v.rental.driverOption)} />
            <KV label="Location" value={[v.rental.city, v.rental.district].filter(Boolean).join(', ')} />
            <KV label="On map" value={v.rental.lat ? 'Yes' : 'Not set'} />
            <Button small variant="secondary" icon="locate" title="Use my current location" loading={busy === 'loc'} onPress={setRentalLocation} style={{ marginTop: 8 }} />
          </Card>
        </Section>
      )}

      {v.forTrips && v.verificationStatus === 'approved' && <Button title="Create a trip with this vehicle" icon="add-circle" onPress={() => navigation.navigate('TripForm', { tripType: 'start' })} style={{ marginBottom: 12 }} />}
      <Button title="Remove vehicle" icon="trash" variant="danger" onPress={remove} loading={busy === 'del'} />
    </Screen>
  );
}
