import { useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { VehicleCard } from '../../components/cards';
import { Chip, Empty, ErrorView, Loading, Row } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { rentalAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { t } from '../../i18n';

const CLASSES = [
  ['', 'All'], ['hatchback', 'Hatchback'], ['sedan', 'Sedan'], ['suv', 'SUV'], ['muv', 'MUV'], ['van', 'Van'], ['mini_bus', 'Mini bus'], ['bike', 'Bike'], ['pickup', 'Pickup'],
];

export default function RentalScreen() {
  const router = useRouter();
  const districts = useAuthStore((s) => s.districts);
  const [district, setDistrict] = useState('');
  const [near, setNear] = useState(null);
  const [vehicleClass, setVehicleClass] = useState('');
  const [driverOption, setDriverOption] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [pickDistrict, setPickDistrict] = useState(false);
  const [locating, setLocating] = useState(false);
  const params = { district: near ? undefined : district || undefined, lat: near?.lat, lng: near?.lng, radiusKm: near ? 40 : undefined, vehicleClass: vehicleClass || undefined, driverOption: driverOption || undefined, availableOnly: availableOnly || undefined, limit: 30 };
  const { data, error, loading, refreshing, reload, refresh } = useFetch(() => rentalAPI.search(params), [JSON.stringify(params)], { cacheKey: `rentals:${JSON.stringify(params)}` });

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setNear({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } finally {
      setLocating(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <View style={{ padding: SPACING.md, paddingBottom: 4 }}>
        <Text style={TYPOGRAPHY.h2}>{t("Rent a vehicle")}</Text>
        <Row style={{ marginTop: 10 }}>
          <Pressable onPress={() => setPickDistrict(true)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: '#fff' }}>
            <MaterialIcons name="place" size={20} color={COLORS.primary} />
            <Text style={{ flex: 1, color: near || district ? COLORS.text.primary : COLORS.text.tertiary }}>{near ? t("Near me") : district || t("Choose area / district")}</Text>
            <MaterialIcons name="expand-more" size={20} color={COLORS.text.secondary} />
          </Pressable>
          <Pressable onPress={useMyLocation} style={{ borderWidth: 1.5, borderColor: COLORS.primaryLight, borderRadius: 12, padding: 12, backgroundColor: near ? COLORS.primaryLight : '#fff' }} accessibilityLabel={t("Use my location")}>
            <MaterialIcons name={locating ? 'hourglass-empty' : 'my-location'} size={20} color={COLORS.primary} />
          </Pressable>
        </Row>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md, paddingVertical: 8 }}>
        <Chip label={t("Available now")} active={availableOnly} onPress={() => setAvailableOnly(!availableOnly)} />
        <Chip label={t("Self drive")} active={driverOption === 'self_drive'} onPress={() => setDriverOption(driverOption === 'self_drive' ? '' : 'self_drive')} />
        <Chip label={t("With driver")} active={driverOption === 'with_driver'} onPress={() => setDriverOption(driverOption === 'with_driver' ? '' : 'with_driver')} />
        {CLASSES.map(([v, l]) => (
          <Chip key={v || 'all'} label={l} active={vehicleClass === v} onPress={() => setVehicleClass(v)} />
        ))}
      </ScrollView>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={{ padding: SPACING.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
          renderItem={({ item }) => <VehicleCard vehicle={item} onPress={() => router.push(`/rental/${item.id}`)} />}
          ListEmptyComponent={<Empty icon="car-rental" text={district || near ? t("No rental vehicles found here yet. Try another area.") : t("Choose an area to see vehicles for rent.")} />}
        />
      )}
      <Modal visible={pickDistrict} animationType="slide" onRequestClose={() => setPickDistrict(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Row style={{ padding: SPACING.md }}>
            <Pressable onPress={() => setPickDistrict(false)} hitSlop={10}>
              <MaterialIcons name="close" size={24} />
            </Pressable>
            <Text style={TYPOGRAPHY.h4}>{t("Choose district")}</Text>
          </Row>
          <FlatList
            data={[{ name: '' }, ...districts]}
            keyExtractor={(d) => d.name || 'all'}
            renderItem={({ item }) => (
              <Pressable onPress={() => (setDistrict(item.name), setNear(null), setPickDistrict(false))} style={{ padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <Text style={[TYPOGRAPHY.body, item.name === district && { color: COLORS.primary, fontWeight: '700' }]}>{item.name || t("All districts")}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
