import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Header, KV } from '../../components/ui';
import useAuthStore from '../../store/authStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import { fullDate, titleCase } from '../../utils/format';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  if (!user) return <Header title="Profile" />;
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title="My profile" />
      <ScrollView contentContainerStyle={{ padding: SPACING.md }}>
        <View style={{ alignItems: 'center', marginBottom: SPACING.lg }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700' }}>{(user.fullName || 'U')[0]}</Text>
          </View>
          <Text style={[TYPOGRAPHY.h3, { marginTop: 10 }]}>{user.fullName || 'No name yet'}</Text>
        </View>
        <Card style={{ marginBottom: SPACING.md }}>
          <KV label="Mobile" value={user.phone} />
          <KV label="Email" value={user.email || '—'} />
          <KV label="Gender" value={titleCase(user.gender) || '—'} />
          <KV label="City" value={user.city || '—'} />
          <KV label="Member since" value={fullDate(user.createdAt)} />
        </Card>
        <Button title="Edit profile" icon="edit" onPress={() => router.push('/profile/edit')} />
      </ScrollView>
    </View>
  );
}
