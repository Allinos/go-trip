import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PlacePicker from '../../components/PlacePicker';
import { Button, Card, Chip, Empty, Header, Loading, LoginPrompt, Row } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import useFetch from '../../hooks/useFetch';
import { errorMessage, userAPI } from '../../services/api';
import { confirm } from '../../utils/confirm';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { t } from '../../i18n';

export default function SavedPlaces() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated)
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        <Header title={t("Saved places")} />
        <LoginPrompt />
      </View>
    );
  return <SavedPlacesList />;
}

function SavedPlacesList() {
  const { data, loading, reload } = useFetch(() => userAPI.savedPlaces(), [], { cacheKey: 'savedPlaces' });
  const [label, setLabel] = useState('Home');
  const [picking, setPicking] = useState(false);
  const add = async (place) => {
    try {
      await userAPI.addPlace({ label, address: place.name, lat: place.lat ?? null, lng: place.lng ?? null });
      reload();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    }
  };
  const remove = async (p) => (await confirm(t("Remove place?"), p.label, { okText: 'Remove', destructive: true })) && (await userAPI.deletePlace(p.id), reload());
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title={t("Saved places")} />
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        {loading ? (
          <Loading />
        ) : data?.length ? (
          data.map((p) => (
            <Card key={p.id} style={{ marginBottom: 10 }}>
              <Row>
                <MaterialIcons name={p.label === 'Home' ? 'home' : p.label === 'Work' ? 'work' : 'bookmark'} size={22} color={COLORS.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={TYPOGRAPHY.bodyBold}>{p.label}</Text>
                  <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{p.address}</Text>
                </View>
                <Pressable onPress={() => remove(p)} hitSlop={10} accessibilityLabel={t("Remove")}>
                  <MaterialIcons name="delete-outline" size={22} color={COLORS.text.tertiary} />
                </Pressable>
              </Row>
            </Card>
          ))
        ) : (
          <Empty icon="bookmark-border" text={t("Save places you travel to often. They appear first when you search.")} />
        )}
        <Text style={[TYPOGRAPHY.captionBold, { marginTop: SPACING.md, marginBottom: 8 }]}>{t("Add a place")}</Text>
        <Row style={{ marginBottom: SPACING.md }}>
          {['Home', 'Work', 'Other'].map((l) => (
            <Chip key={l} label={l} active={label === l} onPress={() => setLabel(l)} />
          ))}
        </Row>
        <Button title={t("Choose {0} location", [label.toLowerCase()])} icon="add-location" onPress={() => setPicking(true)} />
      </ScrollView>
      <PlacePicker visible={picking} title={t("Search {0} location", [label.toLowerCase()])} onClose={() => setPicking(false)} onSelect={add} />
    </View>
  );
}
