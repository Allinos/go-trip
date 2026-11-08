import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BOOKING_STATUS, BORDER_RADIUS, COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { t } from '../i18n';

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, small }) {
  const v = { primary: [COLORS.primary, '#fff', COLORS.primary], outline: ['#fff', COLORS.primary, COLORS.primary], ghost: ['transparent', COLORS.primary, 'transparent'], success: [COLORS.success, '#fff', COLORS.success], dark: [COLORS.text.primary, '#fff', COLORS.text.primary] }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, small && { height: 40, paddingHorizontal: 14 }, { backgroundColor: v[0], borderColor: v[2] }, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v[1]} />
      ) : (
        <>
          {icon && <MaterialIcons name={icon} size={small ? 18 : 20} color={v[1]} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: v[1] }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Card = ({ children, style, onPress }) =>
  onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.9 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={[s.card, style]}>{children}</View>
  );

export const Row = ({ children, style, gap = 8 }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;

export function Header({ title, right, back = true }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: COLORS.background }}>
      <View style={s.header}>
        {back && (
          <Pressable hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityLabel={t("Back")}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text.primary} />
          </Pressable>
        )}
        <Text style={[TYPOGRAPHY.h4, { flex: 1, color: COLORS.text.primary }]} numberOfLines={1}>
          {title}
        </Text>
        {right}
      </View>
    </SafeAreaView>
  );
}

export const StatusBadge = ({ status }) => {
  const st = BOOKING_STATUS[status] || { label: status, color: COLORS.text.secondary, bg: COLORS.divider };
  return (
    <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
      <Text style={{ color: st.color, fontWeight: '700', fontSize: 12 }}>{t(st.label)}</Text>
    </View>
  );
};

export const Pill = ({ text, color = COLORS.primary, bg = COLORS.primaryLight, icon }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' }}>
    {icon && <MaterialIcons name={icon} size={13} color={color} />}
    <Text style={{ color, fontWeight: '600', fontSize: 12 }}>{t(text)}</Text>
  </View>
);

export const Chip = ({ label, active, onPress }) => (
  <Pressable onPress={onPress} style={[s.chip, active && s.chipOn]} accessibilityState={{ selected: active }}>
    <Text style={[TYPOGRAPHY.caption, { color: active ? COLORS.primary : COLORS.text.secondary, fontWeight: active ? '700' : '500' }]}>{t(label)}</Text>
  </Pressable>
);

export const Empty = ({ icon = 'inbox', text, action }) => (
  <View style={{ alignItems: 'center', padding: 40, gap: 10 }}>
    <MaterialIcons name={icon} size={46} color={COLORS.text.tertiary} />
    <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, textAlign: 'center' }]}>{text}</Text>
    {action}
  </View>
);

export const Loading = () => (
  <View style={{ padding: 40, alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

export function ErrorView({ message, onRetry, status }) {
  const router = useRouter();
  if (status === 401) return <LoginPrompt />;
  if (status === 404 || status === 403)
    return <Empty icon="search-off" text={message} action={<Button small variant="outline" title={t("Go back")} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />} />;
  return <Empty icon="cloud-off" text={message} action={onRetry && <Button small variant="outline" title={t("Try again")} onPress={onRetry} />} />;
}

/** Shown to guests on screens that need an account. */
export function LoginPrompt({ text }) {
  const router = useRouter();
  return <Empty icon="lock-outline" text={text || t("Please log in to continue")} action={<Button title={t("Log in")} onPress={() => router.push('/(auth)/login')} />} />;
}

export function Input({ label, style, prefix, ...props }) {
  return (
    <View style={[{ marginBottom: SPACING.md }, style]}>
      {label && <Text style={s.label}>{label}</Text>}
      <View style={s.inputWrap}>
        {prefix && <Text style={[TYPOGRAPHY.body, { color: COLORS.text.secondary, marginRight: 6 }]}>{prefix}</Text>}
        <TextInput placeholderTextColor={COLORS.text.tertiary} style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]} {...props} />
      </View>
    </View>
  );
}

export const KV = ({ label, value }) => (
  <Row style={{ justifyContent: 'space-between', paddingVertical: 5, alignItems: 'flex-start' }}>
    <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary }]}>{label}</Text>
    <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.primary, fontWeight: '600', flex: 1, textAlign: 'right' }]}>{value ?? '—'}</Text>
  </Row>
);

export const Notice = ({ text, title, color = COLORS.info, bg = '#EFF6FF', icon = 'info' }) => (
  <View style={{ flexDirection: 'row', gap: 10, backgroundColor: bg, padding: 12, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.md }}>
    <MaterialIcons name={icon} size={20} color={color} />
    <View style={{ flex: 1 }}>
      {title && <Text style={{ color, fontWeight: '700' }}>{title}</Text>}
      {text && <Text style={{ color }}>{text}</Text>}
    </View>
  </View>
);

export const s = StyleSheet.create({
  btn: { height: 52, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 18 },
  btnText: { fontSize: 16, fontWeight: '700' },
  card: { backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background },
  chipOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  label: { ...TYPOGRAPHY.captionBold, color: COLORS.text.primary, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: 12, backgroundColor: COLORS.background },
  input: { flex: 1, fontSize: 16, color: COLORS.text.primary, paddingVertical: 12, minHeight: 48 },
});
