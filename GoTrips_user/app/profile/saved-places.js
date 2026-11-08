import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PlacePicker from '../../components/PlacePicker';
import { Button, Card, Chip, Empty, Header, Loading, Row } from '../../components/ui';
import useFetch from '../../hooks/useFetch';
import { errorMessage, userAPI } from '../../services/api';
import { confirm } from '../../utils/confirm';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export default function SavedPlaces() {
  const { data, loading, reload } = useFetch(() => userAPI.savedPlaces());
  const [label, setLabel] = useState('Home');
  const [picking, setPicking] = useState(false);
  const add = async (place) => {
    try {
      await userAPI.addPlace({ label, address: place.name, lat: place.lat ?? null, lng: place.lng ?? null });
      reload();
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    }
  };
  const remove = async (p) => (await confirm('Remove place?', p.label, { okText: 'Remove', destructive: true })) && (await userAPI.deletePlace(p.id), reload());
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title="Saved places" />
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
                <Pressable onPress={() => remove(p)} hitSlop={10} accessibilityLabel="Remove">
                  <MaterialIcons name="delete-outline" size={22} color={COLORS.text.tertiary} />
                </Pressable>
              </Row>
            </Card>
          ))
        ) : (
          <Empty icon="bookmark-border" text="Save places you travel to often. They appear first when you search." />
        )}
        <Text style={[TYPOGRAPHY.captionBold, { marginTop: SPACING.md, marginBottom: 8 }]}>Add a place</Text>
        <Row style={{ marginBottom: SPACING.md }}>
          {['Home', 'Work', 'Other'].map((l) => (
            <Chip key={l} label={l} active={label === l} onPress={() => setLabel(l)} />
          ))}
        </Row>
        <Button title={`Choose ${label.toLowerCase()} location`} icon="add-location" onPress={() => setPicking(true)} />
      </ScrollView>
      <PlacePicker visible={picking} title={`Search ${label.toLowerCase()} location`} onClose={() => setPicking(false)} onSelect={add} />
    </View>
  );
}
