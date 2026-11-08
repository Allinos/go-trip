import { useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { DriverCard } from '../../components/cards';
import { Chip, Empty, ErrorView, Loading, Row } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { marketplaceAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const WORK = [
  ['', 'Any work'], ['outstation', 'Outstation'], ['personal', 'Personal driver'], ['daily', 'Daily office'], ['commercial', 'Commercial'], ['event', 'Events'],
];
const VEH = [
  ['', 'Any vehicle'], ['car', 'Car'], ['suv', 'SUV'], ['bus', 'Bus'], ['truck', 'Truck'], ['tempo_traveller', 'Tempo traveller'],
];

export default function MarketplaceScreen() {
  const router = useRouter();
  const districts = useAuthStore((s) => s.districts);
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [district, setDistrict] = useState('');
  const [workType, setWorkType] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [pick, setPick] = useState(false);
  const params = { q: query || undefined, district: district || undefined, workType: workType || undefined, vehicleType: vehicleType || undefined, verifiedOnly: verifiedOnly || undefined, limit: 30 };
  const { data, meta, error, loading, refreshing, reload, refresh } = useFetch(() => marketplaceAPI.drivers(params), [JSON.stringify(params)]);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <View style={{ padding: SPACING.md, paddingBottom: 4 }}>
        <Text style={TYPOGRAPHY.h2}>Hire a driver</Text>
        <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>Browse profiles and call drivers directly</Text>
        <Row style={{ marginTop: 10 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: '#fff' }}>
            <MaterialIcons name="search" size={20} color={COLORS.text.tertiary} />
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={() => setQuery(q.trim())} returnKeyType="search" placeholder="Search name or town" placeholderTextColor={COLORS.text.tertiary} style={{ flex: 1, paddingVertical: 11, fontSize: 15 }} />
          </View>
          <Pressable onPress={() => setPick(true)} style={{ borderWidth: 1.5, borderColor: district ? COLORS.primary : COLORS.border, borderRadius: 12, padding: 11, backgroundColor: district ? COLORS.primaryLight : '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name="place" size={18} color={COLORS.primary} />
            <Text style={{ color: COLORS.text.primary, maxWidth: 90 }} numberOfLines={1}>
              {district || 'Area'}
            </Text>
          </Pressable>
        </Row>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: SPACING.md, paddingVertical: 8 }}>
        <Chip label="✓ Verified only" active={verifiedOnly} onPress={() => setVerifiedOnly(!verifiedOnly)} />
        {WORK.map(([v, l]) => (
          <Chip key={`w${v}`} label={l} active={workType === v} onPress={() => setWorkType(v)} />
        ))}
        {VEH.slice(1).map(([v, l]) => (
          <Chip key={`v${v}`} label={l} active={vehicleType === v} onPress={() => setVehicleType(vehicleType === v ? '' : v)} />
        ))}
      </ScrollView>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ padding: SPACING.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[COLORS.primary]} />}
          ListHeaderComponent={meta?.total ? <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary, marginBottom: 8 }]}>{meta.total} driver(s) found</Text> : null}
          renderItem={({ item }) => <DriverCard driver={item} onPress={() => router.push(`/marketplace/${item.id}`)} />}
          ListEmptyComponent={<Empty icon="badge" text="No drivers match your filters yet. Try another area." />}
        />
      )}
      <Modal visible={pick} animationType="slide" onRequestClose={() => setPick(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <Row style={{ padding: SPACING.md }}>
            <Pressable onPress={() => setPick(false)} hitSlop={10}>
              <MaterialIcons name="close" size={24} />
            </Pressable>
            <Text style={TYPOGRAPHY.h4}>Driver's area</Text>
          </Row>
          <FlatList
            data={[{ name: '' }, ...districts]}
            keyExtractor={(d) => d.name || 'all'}
            renderItem={({ item }) => (
              <Pressable onPress={() => (setDistrict(item.name), setPick(false))} style={{ padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider }}>
                <Text style={[TYPOGRAPHY.body, item.name === district && { color: COLORS.primary, fontWeight: '700' }]}>{item.name || 'All districts'}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
