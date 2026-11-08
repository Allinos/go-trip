import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS } from '../../constants';
import LocationPicker from '../../components/LocationPicker';
import VehicleTypeSelector from '../../components/VehicleTypeSelector';
import SearchCard from '../../components/SearchCard';
import SpecialOffers from '../../components/SpecialOffers';
import QuickRebook from '../../components/QuickRebook';
import useRideStore from '../../store/rideStore';

export default function HomeScreen() {
  const setSearchParams = useRideStore((s) => s.setSearchParams);
  const [location, setLocation] = useState({
    label: 'Hitech City, Hyderabad',
    address: 'Hitech City, Hyderabad',
  });
  const [vehicleType, setVehicleType] = useState('taxi');

  const onVehicle = (id) => {
    setVehicleType(id);
    setSearchParams({ vehicleType: id });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={['top']} style={styles.redTop}>
        <View style={styles.topBar}>
          <View style={styles.logoRow}>
            <MaterialIcons name="directions-car" size={32} color={COLORS.text.white} />
            <Text style={styles.logoText}>RideFlow</Text>
          </View>
          <TouchableOpacity hitSlop={12}>
            <MaterialIcons name="notifications-none" size={28} color={COLORS.text.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.pickerPad}>
          <LocationPicker
            location={location}
            onSelectLocation={(loc) => setLocation(loc)}
          />
        </View>
      </SafeAreaView>

        <View style={[styles.whiteCard,styles.vehicleTypeSelector]}>
          <VehicleTypeSelector selected={vehicleType} onSelect={onVehicle} />
        </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.whiteCard}>
          <SearchCard />
        </View>

        <SpecialOffers />
        <QuickRebook />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  redTop: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  logoText: { ...TYPOGRAPHY.h3, color: COLORS.text.white },
  pickerPad: {},
  scroll: { flex: 1 },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  whiteCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.md,
  },
  vehicleTypeSelector: {
    backgroundColor: COLORS.primary,
    borderRadius:0,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
});
