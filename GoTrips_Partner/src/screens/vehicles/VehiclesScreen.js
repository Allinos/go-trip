import React from 'react';
import { FlatList, Image, RefreshControl, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Empty, ErrorView, Header, Loading, Row } from '../../components/ui';
import { vehicleApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font, space } from '../../theme';
import { rupees, VEHICLE_LABELS } from '../../utils/format';

const STATUS_HELP = { pending: 'Waiting for verification', rejected: 'Needs changes', suspended: 'Suspended', approved: 'Verified' };

export default function VehiclesScreen({ navigation }) {
  const toast = useToast();
  const { data, error, loading, reload, refresh, refreshing, setData } = useApi(() => vehicleApi.list());

  const toggle = async (v, patch) => {
    setData(data.map((x) => (x.id === v.id ? { ...x, ...patch } : x)));
    try {
      await vehicleApi.availability(v.id, patch);
      toast(patch.isAvailable === false ? 'Vehicle switched OFF' : patch.isAvailable ? 'Vehicle switched ON' : patch.rentalAvailable ? 'Shown as available for rent' : 'Shown as not available for rent');
    } catch (e) {
      toast(errorMessage(e), 'error');
      reload();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <Header title="My vehicles" back={false} right={<Button small title="Add" icon="add" onPress={() => navigation.navigate('VehicleForm')} />} />
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
                  <Image source={{ uri: v.photos[0] }} style={{ width: 84, height: 64, borderRadius: 10 }} />
                ) : (
                  <View style={{ width: 84, height: 64, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="car-sport" size={28} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={font.h3}>
                    {v.make} {v.model}
                  </Text>
                  <Text style={font.small}>
                    {v.registrationNumber} · {VEHICLE_LABELS[v.vehicleClass]}
                    {v.seats ? ` · ${v.seats} seats` : ''}
                  </Text>
                  <Row style={{ marginTop: 6 }} gap={6}>
                    <Badge status={v.verificationStatus} text={STATUS_HELP[v.verificationStatus]} />
                    {v.forRental && v.rental?.pricePerDay ? <Badge tone="blue" text={`${rupees(v.rental.pricePerDay)}/day`} /> : null}
                  </Row>
                </View>
              </Row>
              {v.verificationStatus === 'rejected' && v.rejectionReason ? <Text style={{ color: colors.primaryDark, marginTop: 8 }}>{v.rejectionReason}</Text> : null}
              {v.verificationStatus !== 'suspended' && (
                <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text style={font.body}>{v.isAvailable ? 'Vehicle is ON' : 'Vehicle is OFF'}</Text>
                    <Switch value={v.isAvailable} onValueChange={(isAvailable) => toggle(v, { isAvailable })} trackColor={{ true: '#86EFAC' }} thumbColor={v.isAvailable ? colors.green : '#fff'} />
                  </Row>
                  {v.forRental && (
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Text style={font.body}>{v.rentalAvailable ? 'Available for rent' : 'Not available for rent'}</Text>
                      <Switch value={v.rentalAvailable} onValueChange={(rentalAvailable) => toggle(v, { rentalAvailable })} trackColor={{ true: '#86EFAC' }} thumbColor={v.rentalAvailable ? colors.green : '#fff'} />
                    </Row>
                  )}
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={<Empty icon="car-outline" text="No vehicles yet. Add your vehicle — our team verifies it before customers can see it." action={<Button small title="Add vehicle" onPress={() => navigation.navigate('VehicleForm')} />} />}
        />
      )}
    </SafeAreaView>
  );
}
