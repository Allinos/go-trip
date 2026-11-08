import React from 'react';
import { Image, Text, View } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Card, Pill, Row, StatusBadge } from './ui';
import { COLORS, TYPOGRAPHY, VEHICLE_LABELS } from '../constants';
import { dateLabel, rupees, timeLabel } from '../utils/format';
import { t } from '../i18n';
import CachedImage from './CachedImage';
import { RatingPill } from './Stars';

export function TripCard({ trip, onPress }) {
  const m = trip.match;
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Row gap={6}>
          <Pill text={trip.tripType === 'return' ? t("Return trip") : t("Trip")} color={trip.tripType === 'return' ? COLORS.info : COLORS.primary} bg={trip.tripType === 'return' ? '#EFF6FF' : COLORS.primaryLight} />
          {trip.driver?.isVerified && <Pill text={t("Verified")} icon="verified" color={COLORS.success} bg="#ECFDF5" />}
          <RatingPill rating={trip.driver?.rating} />
        </Row>
        <Text style={[TYPOGRAPHY.h4, { color: COLORS.primary }]}>{rupees(m?.farePerSeat ?? trip.pricePerSeat)}</Text>
      </Row>
      <Row style={{ marginTop: 10, alignItems: 'flex-start' }}>
        <View style={{ alignItems: 'center', paddingTop: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary }} />
          <View style={{ width: 2, height: 20, backgroundColor: COLORS.primaryLight }} />
          <MaterialIcons name="place" size={14} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={TYPOGRAPHY.bodyBold}>{m?.pickupName || trip.originName}</Text>
          <Text style={TYPOGRAPHY.bodyBold}>{m?.dropName || trip.destinationName}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={TYPOGRAPHY.bodyBold}>{timeLabel(trip.departureAt)}</Text>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{dateLabel(trip.departureAt)}</Text>
        </View>
      </Row>
      {m && (m.pickupName !== trip.originName || m.dropName !== trip.destinationName) && (
        <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginTop: 6 }]}>{t("Full route:")}{" "}{trip.originName}{" → "}{trip.destinationName}
        </Text>
      )}
      <Row style={{ marginTop: 10, justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 10 }}>
        <Row gap={6} style={{ flex: 1 }}>
          <MaterialCommunityIcons name="car" size={18} color={COLORS.text.secondary} />
          <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, flex: 1 }]} numberOfLines={1}>
            {trip.vehicle?.make} {trip.vehicle?.model}
            {trip.vehicle?.hasAc ? t(" · AC") : ''}{" · "}{trip.driver?.name}
          </Text>
        </Row>
        <Text style={[TYPOGRAPHY.captionBold, { color: trip.availableSeats <= 1 ? COLORS.primary : COLORS.success, marginLeft: 8 }]}>{trip.availableSeats === 1 ? t("1 seat left") : t("{0} seats left", [trip.availableSeats])}</Text>
      </Row>
    </Card>
  );
}

export function DriverCard({ driver: d, onPress }) {
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row gap={12} style={{ alignItems: 'flex-start' }}>
        {d.photoUrl ? <CachedImage uri={d.photoUrl} style={{ width: 60, height: 60, borderRadius: 30 }} /> : <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: COLORS.primary, fontSize: 22, fontWeight: '700' }}>{(d.name || 'D')[0]}</Text></View>}
        <View style={{ flex: 1 }}>
          <Row gap={6}>
            <Text style={TYPOGRAPHY.bodyBold}>{d.name}</Text>
            {d.isVerified && <MaterialIcons name="verified" size={18} color={COLORS.success} />}
          </Row>
          {d.headline ? <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]} numberOfLines={1}>{d.headline}</Text> : null}
          <Row gap={6} style={{ marginTop: 6, flexWrap: 'wrap' }}>
            <Pill text={d.hasPriorExperience ? t("{0} yrs exp", [d.experienceYears]) : t("New driver")} icon="work" />
            {d.district && <Pill text={d.district} icon="place" color={COLORS.text.secondary} bg={COLORS.divider} />}
            {d.availability && <Pill text={d.availability.replace('_', ' ')} color={COLORS.info} bg="#EFF6FF" />}
          </Row>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginTop: 6 }]} numberOfLines={1}>{t("Drives:")}{" "}{d.vehicleTypes.join(', ').replace(/_/g, ' ')}
            {d.languages?.length ? ` · ${d.languages.join(', ')}` : ''}
          </Text>
        </View>
      </Row>
      {d.expectedPay && (
        <Text style={[TYPOGRAPHY.captionBold, { marginTop: 8 }]}>{t("Expected:")}{" "}{rupees(d.expectedPay.min)}
          {d.expectedPay.max && d.expectedPay.max !== d.expectedPay.min ? `–${rupees(d.expectedPay.max)}` : ''} {d.expectedPay.unit?.replace('_', ' ')}
        </Text>
      )}
    </Card>
  );
}

export function VehicleCard({ vehicle: v, onPress }) {
  const r = v.rental;
  return (
    <Card style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }} onPress={onPress}>
      {v.photos?.[0] ? (
        <CachedImage uri={v.photos[0]} style={{ width: '100%', height: 150 }} />
      ) : (
        <View style={{ height: 110, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="car-side" size={52} color={COLORS.text.tertiary} />
        </View>
      )}
      <View style={{ padding: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={TYPOGRAPHY.bodyBold}>
            {v.make} {v.model}
          </Text>
          <Pill text={r?.available ? t("Available") : t("Not available")} color={r?.available ? COLORS.success : COLORS.text.secondary} bg={r?.available ? '#ECFDF5' : COLORS.divider} />
        </Row>
        <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginTop: 2 }]}>
          {VEHICLE_LABELS[v.vehicleClass]}
          {v.seats ? t(" · {0} seats", [v.seats]) : ''}
          {v.hasAc ? t(" · AC") : ''}
          {v.fuelType ? ` · ${v.fuelType}` : ''}
        </Text>
        <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]} numberOfLines={1}>
            <MaterialIcons name="place" size={12} /> {[r?.city, r?.district].filter(Boolean).join(', ')}
            {v.distanceKm != null ? t(" · {0} km", [v.distanceKm]) : ''}
          </Text>
          <Text style={[TYPOGRAPHY.bodyBold, { color: COLORS.primary }]}>{r?.pricePerDay ? t("{0}/day", [rupees(r.pricePerDay)]) : r?.pricePerHour ? t("{0}/hr", [rupees(r.pricePerHour)]) : ''}</Text>
        </Row>
      </View>
    </Card>
  );
}

export function BookingCard({ booking: b, onPress }) {
  return (
    <Card style={{ marginBottom: 12 }} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <StatusBadge status={b.status} />
        <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>#{b.code}</Text>
      </Row>
      <Text style={[TYPOGRAPHY.bodyBold, { marginTop: 8 }]}>
        {b.pickupName}{" → "}{b.dropName}
      </Text>
      <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 2 }]}>
        {dateLabel(b.trip.departureAt)}{", "}{timeLabel(b.trip.departureAt)}{" · "}{b.seats > 1 ? t("{0} seats", [b.seats]) : t("1 seat")}
      </Text>
      <Row style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>
          {b.trip.vehicle?.make} {b.trip.vehicle?.model}{" · "}{b.trip.driver?.name}
        </Text>
        <Text style={TYPOGRAPHY.bodyBold}>{rupees(b.fareEstimate)}</Text>
      </Row>
    </Card>
  );
}
