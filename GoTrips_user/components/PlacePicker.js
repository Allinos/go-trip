import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { catalogAPI, userAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { t } from '../i18n';

const POPULAR = ['Kamrup Metropolitan', 'Nagaon', 'Jorhat', 'Sonitpur', 'Dibrugarh', 'Cachar'];

/**
 * Full-screen place search: suggestions from the server (major points & districts),
 * the user's saved places, and free text ("Use '…'").
 */
export default function PlacePicker({ visible, title, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [saved, setSaved] = useState([]);
  const isAuthenticated = useAuthStore((st) => st.isAuthenticated);
  const districts = useAuthStore((st) => st.districts);

  useEffect(() => {
    if (!visible) return;
    setQ('');
    if (isAuthenticated) userAPI.savedPlaces().then((r) => setSaved(r.data)).catch(() => {});
  }, [visible, isAuthenticated]);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const timer = setTimeout(() => catalogAPI.searchPlaces(q.trim()).then((r) => setResults(r.data)).catch(() => setResults([])), 250);
    return () => clearTimeout(timer);
  }, [q]);

  const pick = (place) => {
    onSelect(place);
    onClose();
  };
  const popular = (districts.length ? districts.map((d) => d.name) : POPULAR).filter((n) => POPULAR.includes(n));
  const data = q.trim().length >= 2 ? [{ type: 'free', name: q.trim() }, ...results] : [...saved.map((p) => ({ type: 'saved', name: p.label, sub: p.address, lat: p.lat, lng: p.lng })), ...popular.map((n) => ({ type: 'popular', name: n }))];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t("Close")}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text.primary} />
          </Pressable>
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder={title || t("Search town or place")} placeholderTextColor={COLORS.text.tertiary} style={{ flex: 1, fontSize: 17, borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: COLORS.text.primary }} />
        </View>
        {q.trim().length < 2 && <Text style={[TYPOGRAPHY.captionBold, { color: COLORS.text.tertiary, paddingHorizontal: SPACING.md, marginTop: 8 }]}>{saved.length ? t("SAVED & POPULAR") : t("POPULAR")}</Text>}
        <FlatList
          data={data}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(it, i) => `${it.type}-${it.name}-${i}`}
          renderItem={({ item }) => (
            <Pressable onPress={() => pick({ name: item.name, district: item.district, lat: item.lat, lng: item.lng })} style={({ pressed }) => [{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.divider }, pressed && { backgroundColor: COLORS.primaryLight }]}>
              <MaterialIcons name={{ free: 'search', saved: 'bookmark', popular: 'trending-up', district: 'map', place: 'place' }[item.type]} size={22} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={TYPOGRAPHY.body}>{item.type === 'free' ? t("Use “{0}”", [item.name]) : item.name}</Text>
                {(item.sub || item.district) && item.type !== 'district' ? <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{item.sub || item.district}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
