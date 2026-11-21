import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import useAuthStore from '../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { t } from '../i18n';

const POPULAR = ['Guwahati', 'Nagaon', 'Jorhat', 'Tezpur', 'Dibrugarh', 'Silchar', 'Shillong'];
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Place search over the predefined towns and districts (the same list partners create trips from),
 * so a search always uses the names that trips use. Free text is not accepted.
 * The list comes with the app catalog, so it also works offline.
 */
export default function PlacePicker({ visible, title, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const districts = useAuthStore((st) => st.districts);
  const reloadCatalog = useAuthStore((st) => st.reloadCatalog);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    if (!districts?.length) reloadCatalog();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = useMemo(() => {
    const out = [];
    for (const d of districts || []) {
      out.push({ type: 'district', name: d.name, district: d.name, key: norm(d.name) });
      for (const p of d.places || []) out.push({ type: 'place', name: p.name, district: d.name, lat: p.lat, lng: p.lng, key: norm(p.name) });
    }
    return out;
  }, [districts]);

  const data = useMemo(() => {
    const k = norm(q);
    if (k.length < 2) {
      const pop = POPULAR.map((n) => all.find((x) => x.type === 'place' && x.name === n)).filter(Boolean).map((x) => ({ ...x, popular: true }));
      return pop.length ? pop : all.filter((x) => x.type === 'place').slice(0, 30);
    }
    // Word starts first ("isbt" → "ISBT Betkuchi"), then anything containing the text.
    // Exact name, then names starting with the text, then word starts, then anything containing it; towns before districts.
    const rank = (x) => (x.key === k ? 0 : x.key.startsWith(k) ? 1 : x.key.includes(` ${k}`) ? 2 : x.key.includes(k) ? 3 : 9) + (x.type === 'district' ? 0.5 : 0);
    return all.map((x) => [rank(x), x]).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0]).map(([, x]) => x).slice(0, 40);
  }, [q, all]);

  const pick = (place) => {
    onSelect({ name: place.name, district: place.district, lat: place.lat, lng: place.lng });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t("Close")}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text.primary} />
          </Pressable>
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder={title || t("Search town or place")} placeholderTextColor={COLORS.text.tertiary} style={{ flex: 1, fontSize: 17, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text.primary }} />
        </View>
        {q.trim().length < 2 && <Text style={[TYPOGRAPHY.captionBold, { color: COLORS.text.tertiary, paddingHorizontal: SPACING.md, marginTop: 8 }]}>{t("POPULAR")}</Text>}
        <FlatList
          data={data}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(it, i) => `${it.type}-${it.district}-${it.name}-${i}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => pick(item)} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider }, pressed && { backgroundColor: COLORS.primaryLight }]}>
              <MaterialIcons name={item.popular ? 'trending-up' : item.type === 'district' ? 'map' : 'place'} size={22} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.body}>{item.name}</Text>
                <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{item.type === 'district' ? t("Whole district") : item.district}</Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, padding: SPACING.md }]}>{all.length ? t("No place with this name. Try a nearby town.") : t("Loading places…")}</Text>}
        />
      </SafeAreaView>
    </Modal>
  );
}
