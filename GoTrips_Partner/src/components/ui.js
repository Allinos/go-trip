import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, font, radius, shadow, space } from '../theme';
import { STATUS_TEXT, titleCase } from '../utils/format';

// ---------------- Layout ----------------

export function Header({ title, back = true, right, onBack }) {
  const nav = useNavigation();
  return (
    <View style={s.header}>
      {back ? (
        <Pressable hitSlop={12} onPress={onBack || (() => nav.goBack())} style={s.headerBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
      ) : (
        <View style={{ width: 8 }} />
      )}
      <Text style={[font.h2, { flex: 1 }]} numberOfLines={1}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** Standard screen: header + scrollable body + optional sticky footer. */
export function Screen({ title, back, right, children, footer, scroll = true, refreshing, onRefresh, padded = true, headerless, onBack }) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && { padding: space.lg }, { paddingBottom: 32 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { padding: space.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {!headerless && <Header title={title} back={back} right={right} onBack={onBack} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer && <SafeAreaView edges={['bottom']} style={s.footer}>{footer}</SafeAreaView>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export const Card = ({ children, style, onPress }) =>
  onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={[s.card, style]}>{children}</View>
  );

export const Row = ({ children, style, gap = space.sm }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
export const Section = ({ title, icon, children, right }) => (
  <View style={{ marginBottom: space.xl }}>
    {title && (
      <Row style={{ marginBottom: space.sm }}>
        {icon && <Ionicons name={icon} size={16} color={colors.primary} />}
        <Text style={[font.label, { color: colors.primary, flex: 1 }]}>{title}</Text>
        {right}
      </Row>
    )}
    {children}
  </View>
);

// ---------------- Buttons ----------------

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, small }) {
  const v = BTN[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [s.btn, small && s.btnSmall, { backgroundColor: v.bg, borderColor: v.border }, (disabled || loading) && { opacity: 0.5 }, pressed && { opacity: 0.85 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color={v.fg} />}
          <Text style={[s.btnText, small && { fontSize: 14 }, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}
const BTN = {
  primary: { bg: colors.primary, border: colors.primary, fg: colors.white },
  secondary: { bg: colors.card, border: colors.primaryBorder, fg: colors.primary },
  ghost: { bg: 'transparent', border: 'transparent', fg: colors.primary },
  success: { bg: colors.green, border: colors.green, fg: colors.white },
  danger: { bg: colors.card, border: colors.primaryBorder, fg: colors.primaryDark },
  dark: { bg: colors.text, border: colors.text, fg: colors.white },
};

export const IconButton = ({ icon, onPress, color = colors.text, badge, label }) => (
  <Pressable onPress={onPress} hitSlop={10} style={{ padding: 6 }} accessibilityLabel={label}>
    <Ionicons name={icon} size={24} color={color} />
    {badge > 0 && (
      <View style={s.dotBadge}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 9 ? '9+' : badge}</Text>
      </View>
    )}
  </Pressable>
);

// ---------------- Inputs ----------------

export function Input({ label, hint, error, prefix, style, inputStyle, required, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label && (
        <Text style={s.label}>
          {label}
          {required && <Text style={{ color: colors.primary }}> *</Text>}
        </Text>
      )}
      <View style={[s.inputWrap, focus && { borderColor: colors.primary }, error && { borderColor: colors.primaryDark }, props.multiline && { alignItems: 'flex-start' }]}>
        {prefix && <Text style={[font.body, { color: colors.sub, marginRight: 6 }]}>{prefix}</Text>}
        <TextInput
          placeholderTextColor={colors.faint}
          style={[s.input, props.multiline && { minHeight: 90, textAlignVertical: 'top', paddingTop: 12 }, inputStyle]}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          {...props}
        />
      </View>
      {error ? <Text style={[font.small, { color: colors.primaryDark, marginTop: 4 }]}>{error}</Text> : hint ? <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

/** Dropdown that opens a full-screen searchable list (easy to use on small phones). */
export function Select({ label, value, options, onChange, placeholder = 'Select', searchable, required, hint, style, renderValue }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => (q ? options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);
  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {label && (
        <Text style={s.label}>
          {label}
          {required && <Text style={{ color: colors.primary }}> *</Text>}
        </Text>
      )}
      <Pressable style={s.inputWrap} onPress={() => setOpen(true)} accessibilityRole="button">
        <Text style={[s.input, { paddingVertical: 14, color: current ? colors.text : colors.faint }]} numberOfLines={1}>
          {current ? (renderValue ? renderValue(current) : current.label) : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.sub} />
      </Pressable>
      {hint && <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text>}
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.screen}>
          <Header title={label || placeholder} onBack={() => setOpen(false)} />
          {(searchable || options.length > 12) && (
            <View style={{ paddingHorizontal: space.lg }}>
              <Input placeholder="Search…" value={q} onChangeText={setQ} autoFocus />
            </View>
          )}
          <FlatList
            data={filtered}
            keyExtractor={(o) => String(o.value)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [s.option, pressed && { backgroundColor: colors.primarySoft }]}
                onPress={() => {
                  onChange(item.value, item);
                  setOpen(false);
                  setQ('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={font.body}>{item.label}</Text>
                  {item.sub ? <Text style={font.small}>{item.sub}</Text> : null}
                </View>
                {item.value === value && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
              </Pressable>
            )}
            ListEmptyComponent={<Empty text="Nothing found" />}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

/** Tappable chips. multiple=true → value is an array. */
export function Chips({ label, options, value, onChange, multiple, required, hint }) {
  const selected = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => (multiple ? onChange(selected(v) ? value.filter((x) => x !== v) : [...(value || []), v]) : onChange(v));
  return (
    <View style={{ marginBottom: space.lg }}>
      {label && (
        <Text style={s.label}>
          {label}
          {required && <Text style={{ color: colors.primary }}> *</Text>}
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = selected(o.value);
          return (
            <Pressable key={String(o.value)} onPress={() => toggle(o.value)} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
              {on && multiple && <Ionicons name="checkmark" size={14} color={colors.primary} />}
              <Text style={{ color: on ? colors.primaryDark : colors.text, fontWeight: on ? '600' : '400' }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {hint && <Text style={[font.small, { marginTop: 6 }]}>{hint}</Text>}
    </View>
  );
}

export function ToggleRow({ title, sub, value, onChange, disabled, icon }) {
  return (
    <Pressable onPress={() => !disabled && onChange(!value)} style={[s.toggleRow, disabled && { opacity: 0.5 }]} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      {icon && <Ionicons name={icon} size={22} color={value ? colors.green : colors.sub} />}
      <View style={{ flex: 1 }}>
        <Text style={font.h3}>{title}</Text>
        {sub ? <Text style={font.small}>{sub}</Text> : null}
      </View>
      <Switch value={!!value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#86EFAC', false: '#E5E7EB' }} thumbColor={value ? colors.green : '#fff'} />
    </Pressable>
  );
}

export function Stepper({ label, value, onChange, min = 1, max = 50, sub }) {
  return (
    <View style={[s.toggleRow, { marginBottom: space.lg }]}>
      <View style={{ flex: 1 }}>
        <Text style={font.h3}>{label}</Text>
        {sub ? <Text style={font.small}>{sub}</Text> : null}
      </View>
      <Pressable onPress={() => onChange(Math.max(min, value - 1))} style={s.stepBtn} accessibilityLabel="Decrease">
        <Ionicons name="remove" size={22} color={colors.primary} />
      </Pressable>
      <Text style={[font.h2, { minWidth: 34, textAlign: 'center' }]}>{value}</Text>
      <Pressable onPress={() => onChange(Math.min(max, value + 1))} style={s.stepBtn} accessibilityLabel="Increase">
        <Ionicons name="add" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ---------------- Display ----------------

const TONES = {
  green: [colors.greenSoft, colors.green],
  red: [colors.primarySoft, colors.primaryDark],
  amber: [colors.amberSoft, colors.amber],
  blue: [colors.blueSoft, colors.blue],
  gray: ['#F3F4F6', colors.sub],
};
const STATUS_TONE = { approved: 'green', accepted: 'green', paid: 'green', active: 'green', completed: 'blue', scheduled: 'blue', ongoing: 'amber', pending: 'amber', created: 'amber', rejected: 'red', cancelled: 'red', suspended: 'red', failed: 'red', expired: 'gray', unverified: 'gray' };

export function Badge({ status, text, tone }) {
  const [bg, fg] = TONES[tone || STATUS_TONE[status] || 'gray'];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text || STATUS_TEXT[status] || titleCase(status)}</Text>
    </View>
  );
}

export function Stat({ label, value, sub, icon, tone = 'red', onPress, style }) {
  const [bg, fg] = TONES[tone];
  return (
    <Card style={[{ flex: 1, padding: space.lg }, style]} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={[font.small, { fontWeight: '600', textTransform: 'uppercase' }]}>{label}</Text>
        {icon && (
          <View style={{ backgroundColor: bg, borderRadius: 8, padding: 5 }}>
            <Ionicons name={icon} size={16} color={fg} />
          </View>
        )}
      </Row>
      <Text style={[font.h1, { marginTop: 6 }]}>{value}</Text>
      {sub ? <Text style={font.small}>{sub}</Text> : null}
    </Card>
  );
}

export const Empty = ({ icon = 'file-tray-outline', text, action }) => (
  <View style={{ alignItems: 'center', padding: 32, gap: 10 }}>
    <Ionicons name={icon} size={42} color={colors.faint} />
    <Text style={[font.sub, { textAlign: 'center' }]}>{text}</Text>
    {action}
  </View>
);

export const Loading = ({ full }) => (
  <View style={[{ padding: 40, alignItems: 'center' }, full && { flex: 1, justifyContent: 'center' }]}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const ErrorView = ({ message, onRetry }) => <Empty icon="cloud-offline-outline" text={message || 'Could not load. Check your internet.'} action={onRetry && <Button small variant="secondary" title="Try again" onPress={onRetry} />} />;

export const Notice = ({ tone = 'amber', icon = 'information-circle', title, text, action }) => {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[s.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && <Text style={{ color: fg, fontWeight: '700', fontSize: 15 }}>{title}</Text>}
        {text && <Text style={{ color: fg, fontSize: 14 }}>{text}</Text>}
        {action}
      </View>
    </View>
  );
};

export function ProgressSteps({ steps, current }) {
  const idx = Math.max(0, steps.findIndex((x) => x.key === current));
  return (
    <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={[font.sub, { fontWeight: '600', color: colors.text }]}>
          Step {idx + 1}: {steps[idx]?.label}
        </Text>
        <Text style={font.small}>
          {idx + 1} of {steps.length}
        </Text>
      </Row>
      <View style={{ height: 6, backgroundColor: colors.primaryBorder, borderRadius: 3 }}>
        <View style={{ height: 6, width: `${((idx + 1) / steps.length) * 100}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export const KV = ({ label, value, mono }) => (
  <Row style={{ justifyContent: 'space-between', paddingVertical: 6, alignItems: 'flex-start' }}>
    <Text style={font.sub}>{label}</Text>
    <Text style={[font.body, { flex: 1, textAlign: 'right', fontWeight: '500' }, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 }]}>{value ?? '—'}</Text>
  </Row>
);

export const MenuItem = ({ icon, title, sub, onPress, right, danger }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [s.menuItem, pressed && { backgroundColor: '#FAFAFA' }]}>
    <View style={[s.menuIcon, danger && { backgroundColor: colors.primarySoft }]}>
      <Ionicons name={icon} size={20} color={danger ? colors.primaryDark : colors.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[font.h3, danger && { color: colors.primaryDark }]}>{title}</Text>
      {sub ? <Text style={font.small}>{sub}</Text> : null}
    </View>
    {right ?? <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
  </Pressable>
);

/** Prompt with a text box (used for reject / cancel reasons). */
export function PromptModal({ visible, title, message, placeholder, confirmText = 'Confirm', danger, required = true, onConfirm, onClose, presets = [] }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(text.trim());
      setText('');
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}>
        <View style={s.sheet}>
          <Text style={font.h2}>{title}</Text>
          {message && <Text style={[font.sub, { marginTop: 6 }]}>{message}</Text>}
          {presets.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {presets.map((p) => (
                <Pressable key={p} style={[s.chip, text === p && s.chipOn]} onPress={() => setText(p)}>
                  <Text>{p}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Input style={{ marginTop: 12 }} placeholder={placeholder} value={text} onChangeText={setText} multiline maxLength={250} />
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button title="Back" variant="ghost" onPress={onClose} small />
            <Button title={confirmText} variant={danger ? 'primary' : 'success'} loading={busy} disabled={required && text.trim().length < 3} onPress={submit} small />
          </Row>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: colors.bg },
  headerBtn: { padding: 4, marginRight: 2 },
  footer: { padding: space.lg, paddingBottom: space.md, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, borderWidth: 1, borderColor: '#F1F1F1', ...shadow },
  btn: { minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: space.lg },
  btnSmall: { minHeight: 40, paddingHorizontal: space.md },
  btnText: { fontSize: 16, fontWeight: '700' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12, minHeight: 48 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space.md, marginBottom: space.sm },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  notice: { flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, marginBottom: space.lg, alignItems: 'flex-start' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: space.lg, backgroundColor: colors.card },
  menuIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dotBadge: { position: 'absolute', top: 2, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: space.xl, paddingBottom: 32 },
});
