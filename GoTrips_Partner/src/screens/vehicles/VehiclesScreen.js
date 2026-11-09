import React from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Empty, ErrorView, Header, Loading, Row } from '../../components/ui';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font, space } from '../../theme';
import { capacityText, categoryOf, CLASS_ICON, rupees, VEHICLE_LABELS } from '../../utils/format';
import { t } from '../../i18n';
import CachedImage from '../../components/CachedImage';

const STATUS_HELP = { pending: 'Waiting for verification', rejected: 'Needs changes', suspended: 'Suspended', approved: 'Verified' };

export default function VehiclesScreen({ navigation }) {
  const toast = useToast();
  const { data, error, loading, reload, refresh, refreshing, setData } = useApi(() => vehicleApi.list(), [], { cacheKey: 'vehicles' });

  const toggle = async (v, patch) => {
    setData(data.map((x) => (x.id === v.id ? { ...x, ...patch } : x)));
    try {
      await vehicleApi.availability(v.id, patch);
      toast(patch.isAvailable === false ? t("Vehicle switched OFF") : patch.isAvailable ? t("Vehicle switched ON") : patch.rentalAvailable ? t("Shown as available for rent") : t("Shown as not available for rent"));
    } catch (e) {
      toast(errorMessage(e), 'error');
      reload();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title={t("My vehicles")} back={false} right={<Button small title={t("Add")} icon="add" onPress={() => navigation.navigate('VehicleForm')} />} />
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={{ padding: space.lg, paddingTop: 4 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />}
          renderItem={({ item: v }) => (
            <Card style={{ marginBottom: 12 }} onPress={() => navigation.navigate('VehicleDetail', { id: v.id })}>
              <Row style={{ alignItems: 'flex-start' }}>
                {v.photos[0] ? (
                  <CachedImage uri={v.photos[0]} style={{ width: 84, height: 64, borderRadius: 10 }} />
                ) : (
                  <View style={{ width: 84, height: 64, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={CLASS_ICON[v.vehicleClass] || 'car-sport'} size={28} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>
                    {v.make} {v.model}
                  </Text>
                  <Text style={font.small}>
                    {[v.registrationNumber, VEHICLE_LABELS[v.vehicleClass], capacityText(v)].filter(Boolean).join(' · ')}
                  </Text>
                  <Row style={{ marginTop: 6 }} gap={6}>
                    <Badge status={v.verificationStatus} text={t(STATUS_HELP[v.verificationStatus])} />
                    {categoryOf(v) === 'commercial' && <Badge tone="gray" icon="cube" text={t('Goods')} />}
                    {v.forRental && v.rental?.pricePerDay ? <Badge tone="blue" text={t("{0}/day", [rupees(v.rental.pricePerDay)])} /> : null}
                  </Row>
                </View>
              </Row>
              {v.verificationStatus === 'rejected' && v.rejectionReason ? <Text style={{ color: colors.primaryDark, marginTop: 8 }}>{v.rejectionReason}</Text> : null}
              {v.verificationStatus !== 'suspended' && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 12, paddingTop: 8, gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={font.body}>{v.isAvailable ? t("Vehicle is ON") : t("Vehicle is OFF")}</Text>
                    <Switch value={v.isAvailable} onValueChange={(isAvailable) => toggle(v, { isAvailable })} color={colors.primary} />
                  </Row>
                  {v.forRental && (
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={font.body}>{v.rentalAvailable ? t("Available for rent") : t("Not available for rent")}</Text>
                      <Switch value={v.rentalAvailable} onValueChange={(rentalAvailable) => toggle(v, { rentalAvailable })} color={colors.primary} />
                    </Row>
                  )}
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={<Empty icon="car-outline" text={t(
            "No vehicles yet. Add your vehicle — our team verifies it before customers can see it."
          )} action={<Button small title={t("Add vehicle")} onPress={() => navigation.navigate('VehicleForm')} />} />}
        />
      )}
    </SafeAreaView>
  );
}
