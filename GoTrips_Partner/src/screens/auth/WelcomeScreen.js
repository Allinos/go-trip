import React from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import LanguageSwitch from '../../components/LanguageSwitch';
import { colors, font, space } from '../../theme';
import { t } from '../../i18n';

const POINTS = [
  ['car-sport', 'List your vehicles and trips'],
  ['people', 'Get booking requests from passengers'],
  ['call', 'Customers call you directly — no commission'],
  ['stats-chart', 'Track your bookings and earnings'],
];

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ alignItems: 'flex-end', paddingHorizontal: space.xl, paddingTop: space.md }}>
        <LanguageSwitch syncServer={false} />
      </View>
      <View style={{ flex: 1, padding: space.xl, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Image source={require('../../../assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 20 }} />
          <Text style={[font.h1, { fontSize: 28, marginTop: 16 }]}>{t("GoTrip Partner")}</Text>
          <Text style={[font.sub, { textAlign: 'center', marginTop: 6 }]}>{t("Drive, rent or run trips — and grow your business")}</Text>
        </View>
        {POINTS.map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <View style={{ backgroundColor: colors.primarySoft, borderRadius: 12, padding: 10 }}>
              <Ionicons name={icon} size={22} color={colors.primary} />
            </View>
            <Text style={[font.body, { flex: 1 }]}>{t(text)}</Text>
          </View>
        ))}
      </View>
      <View style={{ padding: space.xl, gap: 10 }}>
        <Button title={t("Get started")} icon="arrow-forward" onPress={() => navigation.navigate('Phone')} />
        <Text style={[font.small, { textAlign: 'center' }]}>{t("New and existing partners log in with their mobile number")}</Text>
      </View>
    </SafeAreaView>
  );
}
