import { Stack } from 'expo-router';

export default function MarketplaceStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: '#EF4444',
        headerTitleStyle: { fontWeight: '600' },
      }}
    />
  );
}
