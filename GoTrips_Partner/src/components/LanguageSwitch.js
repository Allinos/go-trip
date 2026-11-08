import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { LANGUAGES } from '../i18n';
import { useLanguage } from '../context/LanguageContext';
import { colors } from '../theme';

/** Compact English | অসমীয়া toggle. */
export default function LanguageSwitch({ syncServer = true, style }) {
  const [lang, change] = useLanguage();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.border, padding: 3, alignSelf: 'flex-start' }, style]} accessibilityRole="radiogroup">
      {LANGUAGES.map((l) => {
        const on = lang === l.code;
        return (
          <Pressable key={l.code} onPress={() => change(l.code, { syncServer })} accessibilityRole="radio" accessibilityState={{ selected: on }} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: on ? colors.primary : 'transparent' }}>
            <Text style={{ color: on ? '#fff' : colors.text, fontWeight: '600' }}>{l.native}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
