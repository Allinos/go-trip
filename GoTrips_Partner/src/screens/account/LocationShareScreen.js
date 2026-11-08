import React from 'react';
import { Text } from 'react-native';
import LocationShareCard from '../../components/LocationShareCard';
import { Notice, Screen } from '../../components/ui';
import { font } from '../../theme';

export default function LocationShareScreen() {
  return (
    <Screen title="Live location">
      <Text style={[font.sub, { marginBottom: 16 }]}>Share where you are so passengers with a confirmed booking can open your location in Google Maps.</Text>
      <LocationShareCard />
      <Notice tone="blue" icon="information-circle" text="Only passengers with a confirmed booking can see your location. Sharing stops automatically after the time you choose, or when the trip is completed." />
      <Notice tone="amber" icon="phone-portrait" text="Keep GoTrip Partner open while driving so your location stays updated. It uses very little data." />
    </Screen>
  );
}
