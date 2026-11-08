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

export default function HomeScreen({ navigation }) {
  const { user, onboarding } = useAuth();
  const caps = useCaps();
  const toast = useToast();
  const { data: d, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.dashboard());
  const { data: unread, reload: reloadUnread } = useApi(() => meApi.unread());

  const setAvailable = async (isAvailable) => {
    try {
      await partnerApi.saveDriverProfile({ isAvailable });
      toast(isAvailable ? 'You are visible to customers' : 'You are hidden from the marketplace', isAvailable ? 'success' : 'info');
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
            <Image source={{ uri: user.photoUrl }} style={{ width: 44, height: 44, borderRadius: 22 }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 18 }}>{(user?.fullName || 'P')[0]}</Text>
            </View>
          )}
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={font.small}>Namaskar 🙏</Text>
          <Text style={font.h2} numberOfLines={1}>
            {user?.fullName}
          </Text>
        </View>
        <IconButton icon="notifications-outline" badge={unread?.unread} label="Notifications" onPress={() => (navigation.navigate('Notifications'), setTimeout(reloadUnread, 1500))} />
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
                title={docStep.missing?.some((m) => m.rejected) ? 'Documents need attention' : 'Upload your documents'}
                text={docStep.missing?.map((m) => `${m.label}${m.reason ? `: ${m.reason}` : ''}`).join('\n')}
                action={<Button small title="Fix now" onPress={() => navigation.navigate('Documents', { edit: true })} style={{ alignSelf: 'flex-start', marginTop: 6 }} />}
              />
            )}
            {payStep && (
              <Notice tone="red" icon="card" title={payStep.expired ? 'Your listing has expired' : 'Registration fee pending'} text="Renew to stay visible on the marketplace." action={<Button small title="Renew now" onPress={() => navigation.navigate('RenewPayment', { renew: true })} style={{ alignSelf: 'flex-start', marginTop: 6 }} />} />
            )}
            {onboarding?.verificationStatus === 'pending' && !docStep && <Notice tone="blue" icon="time" title="Verification in progress" text="Our team is checking your documents. You can keep using the app." />}

            {caps.driver && d.driverProfile && (
              <Card style={{ marginBottom: 16 }}>
                <ToggleRow
                  icon={d.driverProfile.isAvailable ? 'radio-button-on' : 'radio-button-off'}
                  title={d.driverProfile.isAvailable ? 'Available for work' : 'Not available'}
                  sub={d.driverProfile.isListed ? 'Customers can find and call you' : d.driverProfile.isAvailable ? 'Not visible yet — check the notices above' : 'Turn on to appear on the marketplace'}
                  value={d.driverProfile.isAvailable}
                  onChange={setAvailable}
                />
                <Row style={{ marginTop: 8 }}>
                  <Stat style={{ padding: 12 }} label="Profile views" value={d.driverProfile.viewCount} icon="eye" tone="blue" />
                  <Stat style={{ padding: 12 }} label="Calls" value={d.contacts.callsLast30Days} sub="last 30 days" icon="call" tone="green" />
                </Row>
                {d.driverProfile.completeness < 100 && (
                  <Pressable onPress={() => navigation.navigate('EditDriverProfile', { edit: true })} style={{ marginTop: 12 }}>
                    <Text style={font.small}>Profile {d.driverProfile.completeness}% complete — tap to improve</Text>
                    <View style={{ height: 6, backgroundColor: colors.primaryBorder, borderRadius: 3, marginTop: 4 }}>
                      <View style={{ height: 6, width: `${d.driverProfile.completeness}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                    </View>
                  </Pressable>
                )}
                {d.partner.listingExpiresAt && <Text style={[font.small, { marginTop: 10 }]}>Listing valid till {fullDate(d.partner.listingExpiresAt)}</Text>}
              </Card>
            )}

            {caps.trips && <LocationShareCard compact />}

            {(caps.trips || caps.vehicles) && (
              <>
                <Card style={{ marginBottom: 12, backgroundColor: '#FFF' }}>
                  <Text style={font.small}>ESTIMATED EARNINGS</Text>
                  <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={[font.h1, { fontSize: 30 }]}>{rupees(d.earnings.totalEstimated)}</Text>
                    <Ionicons name="cash-outline" size={26} color={colors.green} />
                  </Row>
                  <Text style={font.small}>
                    {rupees(d.earnings.thisMonthEstimated)} this month · {rupees(d.earnings.upcomingEstimated)} upcoming
                  </Text>
                  <Button small variant="ghost" title="See earnings details" onPress={() => navigation.navigate('Earnings')} style={{ alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 0 }} />
                </Card>
                <Row style={{ marginBottom: 12 }}>
                  {caps.trips && <Stat label="Requests" value={d.bookings.pending} sub="waiting for you" icon="hourglass" tone="amber" onPress={() => navigation.navigate('Bookings')} />}
                  {caps.trips && <Stat label="Upcoming" value={d.trips.upcoming + d.trips.ongoing} sub="trips" icon="calendar" tone="blue" onPress={() => navigation.navigate('Trips')} />}
                </Row>
                <Row style={{ marginBottom: 16 }}>
                  {caps.vehicles && <Stat label="Vehicles" value={d.vehicles.total} sub={`${d.vehicles.active} active · ${d.vehicles.pending} in review`} icon="car" onPress={() => navigation.navigate('Vehicles')} />}
                  {caps.trips && <Stat label="Completed" value={d.bookings.completed} sub="bookings" icon="checkmark-done" tone="green" />}
                </Row>
              </>
            )}

            {caps.trips && (
              <View style={{ gap: 10, marginBottom: 20 }}>
                <Button title="Create a trip" icon="add-circle" onPress={() => navigation.navigate('TripForm', { tripType: 'start' })} />
                <Button title="Create a return trip" icon="swap-horizontal" variant="secondary" onPress={() => navigation.navigate('Trips', { tab: 'upcoming', pickReturn: true })} />
              </View>
            )}
            {caps.vehicles && !caps.trips && <Button title="Add a vehicle" icon="add-circle" onPress={() => navigation.navigate('VehicleForm')} style={{ marginBottom: 20 }} />}
            {caps.vehicles && d.vehicles.total === 0 && (
              <Notice tone="blue" icon="car" title="Add your first vehicle" text="Vehicles are checked by our team before customers can see them." action={<Button small title="Add vehicle" onPress={() => navigation.navigate('VehicleForm')} style={{ alignSelf: 'flex-start', marginTop: 6 }} />} />
            )}

            {d.pendingRequests.length > 0 && (
              <>
                <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={font.h2}>New booking requests</Text>
                  <Button small variant="ghost" title="View all" onPress={() => navigation.navigate('Bookings')} />
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
