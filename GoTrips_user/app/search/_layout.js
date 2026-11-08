import { Stack } from 'expo-router';

export default function SearchLayout() {
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
