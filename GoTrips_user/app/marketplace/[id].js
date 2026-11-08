import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Modal,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import { marketplaceAPI, paymentAPI } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import CustomButton from '../../components/CustomButton';

export default function DriverProfileScreen() {
  const { id } = useLocalSearchParams();
  const driverId = Array.isArray(id) ? id[0] : id;

  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [phone, setPhone] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await marketplaceAPI.getDriverProfile(driverId);
        const data = res?.data ?? res;
        const d = data?.driver ?? data;
        if (!cancelled) {
          setDriver(d);
          setUnlocked(!!d?.unlocked || !!d?.phoneVisible);
          setPhone(d?.phone || d?.phoneNumber || null);
        }
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driverId]);

  const startUnlock = () => {
    setPayOpen(true);
  };

  const confirmSimulatedRazorpay = async () => {
    try {
      setPaying(true);
      try {
        await paymentAPI.createOrder({
          amount: 4900,
          currency: 'INR',
          purpose: 'unlock_driver',
          driverId,
        });
      } catch {
        /* optional before unlock */
      }
      await marketplaceAPI.unlockDriver(driverId);
      await paymentAPI.verifyPayment({
        driverId,
        razorpay_order_id: 'simulated',
        razorpay_payment_id: 'simulated',
        razorpay_signature: 'simulated',
      });
      const res = await marketplaceAPI.getDriverProfile(driverId);
      const data = res?.data ?? res;
      const d = data?.driver ?? data;
      setUnlocked(true);
      setPhone(d?.phone || d?.phoneNumber || '+91 98765 43210');
      setPayOpen(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Something went wrong');
    } finally {
      setPaying(false);
    }
  };

  if (loading || !driver) {
    return (
      <>
        <Stack.Screen options={{ title: 'Driver' }} />
        <LoadingSpinner />
      </>
    );
  }

  const skills = driver.skills || driver.specializations || ['City rides', 'Airport'];
  const langs = (driver.languages || ['Hindi', 'English']).join(', ');
  const vehicles = driver.vehicles || [];

  return (
    <>
      <Stack.Screen options={{ title: driver.name || 'Driver' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarWrap}>
          {driver.photoUrl || driver.avatar ? (
            <Image source={{ uri: driver.photoUrl || driver.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPh]}>
              <MaterialIcons name="person" size={56} color={COLORS.text.tertiary} />
            </View>
          )}
        </View>
        <Text style={styles.name}>{driver.name || driver.fullName}</Text>
        <View style={styles.rRow}>
          <MaterialIcons name="star" size={18} color={COLORS.warning} />
          <Text style={styles.rating}>{Number(driver.rating || 4.9).toFixed(1)}</Text>
          <Text style={styles.exp}>{driver.experience || '5+ years'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>About</Text>
          <Text style={styles.bio}>{driver.bio || driver.description || 'Professional driver.'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Skills</Text>
          <View style={styles.chips}>
            {skills.map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipTxt}>{s}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Languages</Text>
          <Text style={styles.body}>{langs}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Vehicles</Text>
          {vehicles.length === 0 ? (
            <Text style={styles.body}>Sedan · White Dzire</Text>
          ) : (
            vehicles.map((v, i) => (
              <Text key={i} style={styles.body}>
                {v.name || v.model}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.h}>Reviews</Text>
          {(driver.reviews || []).length === 0 ? (
            <Text style={styles.sub}>No reviews yet.</Text>
          ) : (
            driver.reviews.map((r, i) => (
              <Text key={i} style={styles.review}>
                ★ {r.rating} — {r.comment}
              </Text>
            ))
          )}
        </View>

        {!unlocked ? (
          <CustomButton
            title="Unlock Contact (₹49)"
            onPress={startUnlock}
            loading={paying}
          />
        ) : (
          <View style={styles.unlocked}>
            <Text style={styles.phone}>{phone || '—'}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.call} onPress={() => Linking.openURL(`tel:${phone}`)}>
                <MaterialIcons name="call" color={COLORS.text.white} size={22} />
                <Text style={styles.callTxt}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sms} onPress={() => Linking.openURL(`sms:${phone}`)}>
                <MaterialIcons name="sms" color={COLORS.primary} size={22} />
                <Text style={styles.smsTxt}>SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={payOpen} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete payment</Text>
            <Text style={styles.modalSub}>
              Razorpay checkout would open here. For development, confirm to simulate a successful payment.
            </Text>
            <CustomButton title="Simulate Razorpay success" loading={paying} onPress={confirmSimulatedRazorpay} />
            <TouchableOpacity onPress={() => setPayOpen(false)} style={styles.cancel}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  avatarWrap: { alignItems: 'center', marginBottom: SPACING.md },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: COLORS.surface },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  name: { ...TYPOGRAPHY.h2, color: COLORS.text.primary, textAlign: 'center' },
  rRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: SPACING.sm },
  rating: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary },
  exp: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginLeft: SPACING.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  h: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.primary, marginBottom: SPACING.sm },
  bio: { ...TYPOGRAPHY.body, color: COLORS.text.secondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  chipTxt: { ...TYPOGRAPHY.small, color: COLORS.primary, fontWeight: '600' },
  body: { ...TYPOGRAPHY.body, color: COLORS.text.primary },
  sub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary },
  review: { ...TYPOGRAPHY.caption, color: COLORS.text.primary, marginBottom: SPACING.xs },
  unlocked: { marginTop: SPACING.md },
  phone: { ...TYPOGRAPHY.h4, color: COLORS.text.primary, textAlign: 'center', marginBottom: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.md },
  call: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  callTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.white },
  sms: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  smsTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.primary },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: { ...TYPOGRAPHY.h3, color: COLORS.text.primary },
  modalSub: { ...TYPOGRAPHY.caption, color: COLORS.text.secondary, marginVertical: SPACING.md },
  cancel: { alignItems: 'center', padding: SPACING.md },
  cancelTxt: { ...TYPOGRAPHY.bodyBold, color: COLORS.text.secondary },
});
