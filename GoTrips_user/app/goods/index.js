import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import PlacePicker from '../../components/PlacePicker';
import { Button, Card, Empty, Header, Input, KV, Notice } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { errorMessage, goodsAPI } from '../../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { dateLabel, rupees } from '../../utils/format';
import { t } from '../../i18n';

/** Goods transport orders. Only reachable when the admin enables the feature (hidden otherwise). */
export default function Goods() {
  const config = useAuthStore((s) => s.config);
  const enabled = !!config?.features?.goodsOrders;
  const list = useFetch(() => goodsAPI.list(), [], { enabled });
  const [pick, setPick] = useState(null);
  const [f, setF] = useState({ pickupName: '', dropName: '', goodsType: '', weightKg: '', budget: '', description: '' });
  const [busy, setBusy] = useState(false);
  if (!enabled)
    return (
      <View style={{ flex: 1 }}>
        <Header title={t("Goods transport")} />
        <Empty icon="local-shipping" text={t("Goods transport is coming soon.")} />
      </View>
    );
  const submit = async () => {
    setBusy(true);
    try {
      await goodsAPI.create({ ...f, weightKg: f.weightKg ? Number(f.weightKg) : null, budget: f.budget ? Number(f.budget) : null, pickupDate: new Date(Date.now() + 86400_000).toISOString(), description: f.description || null });
      Alert.alert(t("Posted"), t("Truck owners near you can now see your order and call you."));
      setF({ pickupName: '', dropName: '', goodsType: '', weightKg: '', budget: '', description: '' });
      list.reload();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Goods transport")} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <Notice text={t(
          "Post what you need moved. Verified truck & tempo owners will call you to agree the price."
        )} />
        <Input label={t("Pickup")} value={f.pickupName} onFocus={() => setPick('pickupName')} onChangeText={(v) => setF({ ...f, pickupName: v })} />
        <Input label={t("Drop")} value={f.dropName} onFocus={() => setPick('dropName')} onChangeText={(v) => setF({ ...f, dropName: v })} />
        <Input label={t("What goods?")} value={f.goodsType} onChangeText={(v) => setF({ ...f, goodsType: v })} placeholder={t("e.g. Furniture, rice bags")} />
        <Input label={t("Approx. weight (kg)")} value={f.weightKg} onChangeText={(v) => setF({ ...f, weightKg: v.replace(/\D/g, '') })} keyboardType="number-pad" />
        <Input label={t("Budget (optional)")} prefix="₹" value={f.budget} onChangeText={(v) => setF({ ...f, budget: v.replace(/\D/g, '') })} keyboardType="number-pad" />
        <Button title={t("Post order")} onPress={submit} loading={busy} disabled={!f.pickupName || !f.dropName || !f.goodsType} />
        <Text style={[TYPOGRAPHY.h4, { marginVertical: SPACING.md }]}>{t("My orders")}</Text>
        {(list.data || []).map((o) => (
          <Card key={o.id} style={{ marginBottom: 8 }}>
            <Text style={TYPOGRAPHY.bodyBold}>
              {o.pickupName}{" → "}{o.dropName}
            </Text>
            <KV label={t("Goods")} value={o.goodsType} />
            <KV label={t("Date")} value={dateLabel(o.pickupDate)} />
            {o.budget ? <KV label={t("Budget")} value={rupees(o.budget)} /> : null}
            <KV label={t("Status")} value={o.status} />
          </Card>
        ))}
      </ScrollView>
      <PlacePicker visible={!!pick} onClose={() => setPick(null)} onSelect={(p) => setF({ ...f, [pick]: p.name })} />
    </View>
  );
}
