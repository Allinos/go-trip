import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ErrorView, IconButton, Loading, Notice, Row, Stat, ToggleRow } from '../../components/ui';
import LocationShareCard from '../../components/LocationShareCard';
import BookingCard from '../../components/BookingCard';
import { meApi, partnerApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { useAuth, useCaps } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../api/client';
import { colors, font, space } from '../../theme';
import { fullDate, rupees } from '../../utils/format';
import { ScrollView, RefreshControl } from 'react-native';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

export default function HomeScreen({ navigation }) {
  const { user, onboarding } = useAuth();
  const caps = useCaps();
  const toast = useToast();
  const { data: d, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.dashboard(), [], { cacheKey: 'dashboard' });
  const { data: unread, reload: reloadUnread } = useApi(() => meApi.unread());

  const setAvailable = async (isAvailable) => {
    try {
      await partnerApi.saveDriverProfile({ isAvailable });
      toast(isAvailable ? t("You are visible to customers") : t("You are hidden from the marketplace"), isAvailable ? t("success") : t("info"));
      reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    }
  };

  const steps = d?.pendingSteps || [];
  const docStep = steps.find((x) => x.key === 'documents');
  const payStep = steps.find((x) => x.key === 'payment');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Row style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
        <Pressable onPress={() => navigation.navigate('Account')}>
          {user?.photoUrl ? (
            <CachedImage uri={user.photoUrl} style={{ width: 44, height: 44, borderRadius: 22 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{(user?.fullName || 'P')[0]}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={font.small}>{t("Namaskar 🙏")}</Text>
          <Text style={font.h2} numberOfLines={1}>
            {user?.fullName}
          </Text>
        </View>
        <IconButton icon="notifications-outline" badge={unread?.unread} label={t("Notifications")} onPress={() => (navigation.navigate('Notifications'), setTimeout(reloadUnread, 1500))} />
      </Row>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 4, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => (refresh(), reloadUnread())} colors={[colors.primary]} />}>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorView message={error} onRetry={reload} />
        ) : (
          <>
            {docStep && (
              <Notice
                tone="red"
                icon="document-text"
                title={docStep.missing?.some((m) => m.rejected) ? t("Documents need attention") : t("Upload your documents")}
                text={docStep.missing?.map((m) => `${m.label}${m.reason ? `: ${m.reason}` : ''}`).join('\n')}
                action={<Button small title={t("Fix now")} onPress={() => navigation.navigate('Documents', { edit: true })} style={{ alignSelf: 'flex-start', marginTop: 6 }} />}
              />
            )}
            {payStep && (
              <Notice tone="red" icon="card" title={payStep.expired ? t("Your listing has expired") : t("Registration fee pending")} text={t("Renew to stay visible on the marketplace.")} action={<Button small title={t("Renew now")} onPress={() => navigation.navigate('RenewPayment', { renew: true })} style={{ alignSelf: 'flex-start', marginTop: 6 }} />} />
            )}
            {onboarding?.verificationStatus === 'pending' && !docStep && <Notice tone="blue" icon="time" title={t("Verification in progress")} text={t("Our team is checking your documents. You can keep using the app.")} />}

            {caps.driver && d.driverProfile && (
              <Card style={{ marginBottom: 16 }}>
                <ToggleRow
                  icon={d.driverProfile.isAvailable ? 'radio-button-on' : 'radio-button-off'}
                  title={d.driverProfile.isAvailable ? t("Available for work") : t("Not available")}
                  sub={d.driverProfile.isListed ? t("Customers can find and call you") : d.driverProfile.isAvailable ? t("Not visible yet — check the notices above") : t("Turn on to appear on the marketplace")}
                  value={d.driverProfile.isAvailable}
                  onChange={setAvailable}
                />
                <Row style={{ marginTop: 8 }}>
                  <Stat style={{ padding: 12 }} label={t("Profile views")} value={d.driverProfile.viewCount} icon="eye" tone="blue" />
                  <Stat style={{ padding: 12 }} label={t("Calls")} value={d.contacts.callsLast30Days} sub={t("last 30 days")} icon="call" tone="green" />
                </Row>
                {d.driverProfile.completeness < 100 && (
                  <Pressable onPress={() => navigation.navigate('EditDriverProfile', { edit: true })} style={{ marginTop: 12 }}>
                    <Text style={font.small}>{t("Profile")}{" "}{d.driverProfile.completeness}{t("% complete — tap to improve")}</Text>
                    <View style={{ height: 6, backgroundColor: colors.primaryBorder, borderRadius: 3, marginTop: 4 }}>
                      <View style={{ height: 6, width: `${d.driverProfile.completeness}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                  </Pressable>
                )}
                {d.partner.listingExpiresAt && <Text style={[font.small, { marginTop: 10 }]}>{t("Listing valid till")}{" "}{fullDate(d.partner.listingExpiresAt)}</Text>}
              </Card>
            )}

            {caps.trips && <LocationShareCard compact />}

            {(caps.trips || caps.vehicles) && (
              <>
                <Card style={{ marginBottom: 12, backgroundColor: '#FFF' }}>
                  <Text style={font.small}>{t("ESTIMATED EARNINGS")}</Text>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={[font.h1, { fontSize: 30 }]}>{rupees(d.earnings.totalEstimated)}</Text>
                    <Ionicons name="cash-outline" size={26} color={colors.green} />
                  </Row>
                  <Text style={font.small}>
                    {rupees(d.earnings.thisMonthEstimated)}{" "}{t("this month ·")}{" "}{rupees(d.earnings.upcomingEstimated)}{" "}{t("upcoming")}</Text>
                  <Button small variant="ghost" title={t("See earnings details")} onPress={() => navigation.navigate('Earnings')} style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 0 }} />
                </Card>
                <Row style={{ marginBottom: 12 }}>
                  {caps.trips && <Stat label={t("Requests")} value={d.bookings.pending} sub={t("waiting for you")} icon="hourglass" tone="amber" onPress={() => navigation.navigate('Bookings')} />}
                  {caps.trips && <Stat label={t("Upcoming")} value={d.trips.upcoming + d.trips.ongoing} sub={t("trips")} icon="calendar" tone="blue" onPress={() => navigation.navigate('Trips')} />}
                </Row>
                <Row style={{ marginBottom: 16 }}>
                  {caps.vehicles && <Stat label={t("Vehicles")} value={d.vehicles.total} sub={t("{0} active · {1} in review", [d.vehicles.active, d.vehicles.pending])} icon="car" onPress={() => navigation.navigate('Vehicles')} />}
                  {caps.trips && <Stat label={t("Completed")} value={d.bookings.completed} sub={t("bookings")} icon="checkmark-done" tone="green" />}
                </Row>
              </>
            )}

            {caps.trips && (
              <View style={{ gap: 10, marginBottom: 20 }}>
                <Button title={t("Create a trip")} icon="add-circle" onPress={() => navigation.navigate('TripForm', { tripType: 'start' })} />
                <Button title={t("Create a return trip")} icon="swap-horizontal" variant="secondary" onPress={() => navigation.navigate('Trips', { tab: 'upcoming', pickReturn: true })} />
              </View>
            )}
            {caps.vehicles && !caps.trips && <Button title={t("Add a vehicle")} icon="add-circle" onPress={() => navigation.navigate('VehicleForm')} style={{ marginBottom: 20 }} />}
            {caps.vehicles && d.vehicles.total === 0 && (
              <Notice tone="blue" icon="car" title={t("Add your first vehicle")} text={t("Vehicles are checked by our team before customers can see them.")} action={<Button small title={t("Add vehicle")} onPress={() => navigation.navigate('VehicleForm')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />} />
            )}

            {d.pendingRequests.length > 0 && (
              <>
                <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={font.h2}>{t("New booking requests")}</Text>
                  <Button small variant="ghost" title={t("View all")} onPress={() => navigation.navigate('Bookings')} />
                </Row>
                {d.pendingRequests.map((b) => (
                  <BookingCard key={b.id} booking={{ ...b, status: 'pending', trip: { departureAt: b.departureAt } }} onChanged={reload} onPress={() => navigation.navigate('BookingDetail', { id: b.id })} />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
