import { Stack } from 'expo-router';

export default function ProfileLayout() {
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
