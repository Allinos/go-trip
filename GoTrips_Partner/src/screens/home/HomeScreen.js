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

const styles = {
  hero: { backgroundColor: colors.primary, borderRadius: 16, padding: 16, marginBottom: 20 },
  heroLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroValue: { color: '#fff', fontSize: 32, lineHeight: 40, fontWeight: '800', marginTop: 4 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  grid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  action: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.divider },
  actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  stat: { flexBasis: '46%', flexGrow: 1 },
};

export default function HomeScreen({ navigation }) {
  const { user, onboarding } = useAuth();
  const caps = useCaps();
  const toast = useToast();
  const { data: d, error, loading, reload, refresh, refreshing } = useApi(() => partnerApi.dashboard(), [], { cacheKey: 'dashboard' });
  const { data: unread, reload: reloadUnread } = useApi(() => meApi.unread());

  const setAvailable = async (isAvailable) => {
    try {
      await partnerApi.saveDriverProfile({ isAvailable });
      toast(isAvailable ? t("You are visible to customers") : t("You are hidden from the marketplace"), isAvailable ? 'success' : 'info');
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
          <Text style={font.small}>{t("Namaskar 🙏")}{caps.name ? ` · ${caps.name}` : ''}</Text>
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
                  <Stat style={{ padding: 12 }} label={t("Rating")} value={d.rating?.count ? `★ ${d.rating.average.toFixed(1)}` : '—'} sub={d.rating?.count ? t("{0} rating(s)", [d.rating.count]) : t("No ratings yet")} icon="star" tone="amber" onPress={() => navigation.navigate('Reviews')} />
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
                <View style={styles.hero}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={styles.heroLabel}>{t("Estimated earnings")}</Text>
                    <Ionicons name="wallet-outline" size={22} color="#fff" />
                  </Row>
                  <Text style={styles.heroValue}>{rupees(d.earnings.totalEstimated)}</Text>
                  <Row gap={16} style={{ marginTop: 4 }}>
                    <Text style={styles.heroSub}>{t("This month")} <Text style={{ fontWeight: '700', color: '#fff' }}>{rupees(d.earnings.thisMonthEstimated)}</Text></Text>
                    <Text style={styles.heroSub}>{t("Upcoming")} <Text style={{ fontWeight: '700', color: '#fff' }}>{rupees(d.earnings.upcomingEstimated)}</Text></Text>
                  </Row>
                  <Pressable onPress={() => navigation.navigate('Earnings')} style={styles.heroLink} accessibilityRole="button">
                    <Text style={{ color: '#fff', fontWeight: '600' }}>{t("See earnings details")}</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </Pressable>
                </View>

                <Text style={[font.label, { marginBottom: 8 }]}>{t("Quick actions")}</Text>
                <View style={styles.grid}>
                  {[
                    caps.trips && ['add-circle', t("Create trip"), () => navigation.navigate('TripForm', { tripType: 'start' })],
                    caps.trips && ['swap-horizontal', t("Return trip"), () => navigation.navigate('Trips', { tab: 'upcoming', pickReturn: true })],
                    caps.vehicles && ['car', t("Add vehicle"), () => navigation.navigate('VehicleForm')],
                    caps.trips && ['people', t("Requests"), () => navigation.navigate('Bookings')],
                  ]
                    .filter(Boolean)
                    .map(([icon, label, onPress]) => (
                      <Pressable key={label} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.primarySoft }]} accessibilityRole="button">
                        <View style={styles.actionIcon}>
                          <Ionicons name={icon} size={22} color={colors.primary} />
                        </View>
                        <Text style={[font.small, { color: colors.text, fontWeight: '600', textAlign: 'center' }]} numberOfLines={2}>{label}</Text>
                      </Pressable>
                    ))}
                </View>

                <Text style={[font.label, { marginBottom: 8, marginTop: 4 }]}>{t("Overview")}</Text>
                <View style={styles.statGrid}>
                  {caps.trips && <Stat style={styles.stat} label={t("Requests")} value={d.bookings.pending} sub={t("waiting for you")} icon="hourglass" tone="amber" onPress={() => navigation.navigate('Bookings')} />}
                  {caps.trips && <Stat style={styles.stat} label={t("Upcoming trips")} value={d.trips.upcoming + d.trips.ongoing} sub={t("{0} completed", [d.trips.completed])} icon="calendar" tone="blue" onPress={() => navigation.navigate('Trips')} />}
                  {caps.vehicles && <Stat style={styles.stat} label={t("Vehicles")} value={d.vehicles.total} sub={t("{0} active · {1} in review", [d.vehicles.active, d.vehicles.pending])} icon="car" onPress={() => navigation.navigate('Vehicles')} />}
                  {caps.trips && <Stat style={styles.stat} label={t("Rating")} value={d.rating?.count ? `★ ${d.rating.average.toFixed(1)}` : '—'} sub={d.rating?.count ? t("{0} rating(s)", [d.rating.count]) : t("No ratings yet")} icon="star" tone="amber" onPress={() => navigation.navigate('Reviews')} />}
                </View>
              </>
            )}

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
