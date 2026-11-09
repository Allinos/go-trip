/**
 * GoTrip Partner UI kit, built on react-native-paper (Material Design 3, the system MUI follows).
 * Screens import only from here so the look stays consistent: outlined text fields with floating labels,
 * bottom-sheet selects, contained / outlined / text buttons, surface cards and a horizontal stepper.
 */
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Badge as PBadge, Button as PButton, Chip, Dialog, HelperText, IconButton as PIconButton, Portal, RadioButton, SegmentedButtons, Switch, TextInput, TouchableRipple } from 'react-native-paper';
import { colors, font, radius, shadow, space } from '../theme';
import { STATUS_TEXT, titleCase } from '../utils/format';
import { t } from '../i18n';

const ion = (name) => (name ? ({ size, color }) => <Ionicons name={name} size={size} color={color} /> : undefined);
const withRequired = (label, required) => (label ? (required ? `${label} *` : label) : undefined);

// ---------------- Layout ----------------

/** Top app bar: back arrow, title, optional subtitle and actions. */
export function Header({ title, subtitle, back = true, right, onBack }) {
  const nav = useNavigation();
  return (
    <View style={s.header}>
      {back ? (
        <PIconButton icon={ion('arrow-back')} size={24} onPress={onBack || (() => nav.goBack())} accessibilityLabel={t('Go back')} style={{ marginLeft: -8, marginRight: 0 }} />
      ) : (
        <View style={{ width: 4 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={font.h2} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={font.small} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/**
 * Standard screen: app bar + scrollable body + optional sticky footer (primary action).
 * The keyboard pushes the footer up on both platforms (Android runs edge-to-edge, so the window no longer resizes itself).
 */
export function Screen({ title, subtitle, back, right, children, footer, scroll = true, refreshing, onRefresh, padded = true, headerless, onBack }) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && { padding: space.lg }, { paddingBottom: 40 }]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} /> : undefined}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { padding: space.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}>
      {!headerless && <Header title={title} subtitle={subtitle} back={back} right={right} onBack={onBack} />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'web' ? undefined : 'padding'}>
        {body}
        {footer ? (
          <SafeAreaView edges={['bottom']} style={s.footer}>
            {footer}
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={['bottom']} />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Surface card. With onPress it shows the Android ripple. */
export const Card = ({ children, style, onPress, outlined }) => {
  const st = [s.card, outlined && s.cardOutlined, style];
  if (!onPress) return <View style={st}>{children}</View>;
  // Ripple needs the radius on an inner wrapper so it is clipped to the card shape.
  const flat = StyleSheet.flatten(st);
  const { padding, paddingHorizontal, paddingVertical, paddingTop, paddingBottom, ...outer } = flat;
  return (
    <View style={[outer, { overflow: 'hidden', padding: 0 }]}>
      <TouchableRipple onPress={onPress} rippleColor="rgba(220,38,38,0.08)" style={{ padding: padding ?? space.lg, paddingHorizontal, paddingVertical, paddingTop, paddingBottom }}>
        <View>{children}</View>
      </TouchableRipple>
    </View>
  );
};

export const Row = ({ children, style, gap = space.sm }) => <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
export const Divider = ({ style }) => <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space.md }, style]} />;

/**
 * Form section: a titled card that groups related fields.
 * plain=true renders only the title (for lists of cards).
 */
export const Section = ({ title, subtitle, icon, children, right, plain, style }) => {
  const head = title ? (
    <Row style={{ marginBottom: subtitle ? 2 : space.md }}>
      {icon && <Ionicons name={icon} size={18} color={colors.primary} />}
      <Text style={[font.h3, { flex: 1 }]}>{title}</Text>
      {right}
    </Row>
  ) : null;
  const sub = subtitle ? <Text style={[font.small, { marginBottom: space.md }]}>{subtitle}</Text> : null;
  if (plain)
    return (
      <View style={[{ marginBottom: space.xl }, style]}>
        {head}
        {sub}
        {children}
      </View>
    );
  return (
    <View style={[s.card, { marginBottom: space.lg, paddingBottom: space.xs }, style]}>
      {head}
      {sub}
      {children}
    </View>
  );
};

// ---------------- Buttons ----------------

const BTN = {
  primary: { mode: 'contained' },
  secondary: { mode: 'outlined' },
  ghost: { mode: 'text' },
  tonal: { mode: 'contained-tonal' },
  success: { mode: 'contained', buttonColor: colors.green, textColor: colors.white },
  danger: { mode: 'outlined', textColor: colors.primaryDark },
  dark: { mode: 'contained', buttonColor: colors.text, textColor: colors.white },
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, style, small, compact }) {
  const v = BTN[variant] || BTN.primary;
  return (
    <PButton
      mode={v.mode}
      onPress={onPress}
      loading={loading}
      disabled={disabled || loading}
      icon={ion(icon)}
      buttonColor={disabled ? undefined : v.buttonColor}
      textColor={disabled ? undefined : v.textColor}
      compact={compact}
      style={[{ borderRadius: radius.md }, v.mode === 'outlined' && !disabled && { borderColor: variant === 'danger' ? colors.primaryBorder : colors.border }, style]}
      contentStyle={{ height: small ? 40 : 50 }}
      labelStyle={[{ fontSize: small ? 14 : 16, fontWeight: '600', letterSpacing: 0.1 }, icon ? { marginLeft: v.mode === 'text' ? 20 : small ? 22 : 26, marginRight: small ? 14 : 20 } : { marginHorizontal: small ? 12 : 16 }]}
      accessibilityLabel={title}
    >
      {title}
    </PButton>
  );
}

export const IconButton = ({ icon, onPress, color = colors.text, badge, label, size = 24, mode }) => (
  <View>
    <PIconButton icon={ion(icon)} iconColor={color} size={size} onPress={onPress} accessibilityLabel={label} mode={mode} style={{ margin: 0 }} />
    {badge > 0 && <PBadge style={{ position: 'absolute', top: 2, right: 2, backgroundColor: colors.primary }} size={18}>{badge > 9 ? '9+' : badge}</PBadge>}
  </View>
);

// ---------------- Inputs ----------------

/** Outlined text field with floating label, prefix/suffix, helper or error text. */
export function Input({ label, hint, error, prefix, suffix, style, inputStyle, required, icon, multiline, ...props }) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      <TextInput
        mode="outlined"
        dense
        label={withRequired(label, required)}
        accessibilityLabel={label || props.placeholder}
        error={!!error}
        multiline={multiline}
        left={prefix ? <TextInput.Affix text={prefix} /> : icon ? <TextInput.Icon icon={ion(icon)} color={colors.sub} /> : undefined}
        right={suffix ? <TextInput.Affix text={suffix} /> : undefined}
        outlineStyle={{ borderRadius: radius.md }}
        style={[{ backgroundColor: colors.card, fontSize: 16 }, multiline && { minHeight: 96 }, inputStyle]}
        placeholderTextColor={colors.faint}
        {...props}
      />
      {error ? (
        <HelperText type="error" style={s.helper}>
          {error}
        </HelperText>
      ) : hint ? (
        <HelperText type="info" style={s.helper}>
          {hint}
        </HelperText>
      ) : null}
    </View>
  );
}

/** A read-only outlined field that opens something on tap (used by Select and the date picker). */
export function FieldButton({ label, value, placeholder, onPress, icon, rightIcon = 'chevron-down', required, error, hint, style, disabled }) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityLabel={label} style={disabled && { opacity: 0.6 }}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            dense
            editable={false}
            label={withRequired(label, required)}
            accessibilityLabel={label}
            value={value || ''}
            placeholder={placeholder}
            error={!!error}
            left={icon ? <TextInput.Icon icon={ion(icon)} color={colors.primary} /> : undefined}
            right={<TextInput.Icon icon={ion(rightIcon)} color={colors.sub} />}
            outlineStyle={{ borderRadius: radius.md }}
            style={{ backgroundColor: colors.card, fontSize: 16 }}
            textColor={colors.text}
          />
        </View>
      </Pressable>
      {error ? (
        <HelperText type="error" style={s.helper}>
          {error}
        </HelperText>
      ) : hint ? (
        <HelperText type="info" style={s.helper}>
          {hint}
        </HelperText>
      ) : null}
    </View>
  );
}

/** Bottom sheet that respects the status bar and navigation bar on Android (edge-to-edge). */
export function Sheet({ visible, onClose, title, children, full }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaProvider>
        <SheetBody title={title} onClose={onClose} full={full}>
          {children}
        </SheetBody>
      </SafeAreaProvider>
    </Modal>
  );
}
function SheetBody({ title, onClose, children, full }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.modalBackdrop}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel={t('Close')} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + space.md, maxHeight: '85%' }, full && { height: '85%' }]}>
        <View style={s.grabber} />
        {title ? (
          <Row style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
            <Text style={[font.h2, { flex: 1 }]} numberOfLines={1}>
              {title}
            </Text>
            <PIconButton icon={ion('close')} size={22} onPress={onClose} accessibilityLabel={t('Close')} style={{ margin: 0 }} />
          </Row>
        ) : null}
        {children}
      </View>
    </View>
  );
}

/** Dropdown: outlined field + bottom-sheet list with radio buttons and search for long lists. */
export function Select({ label, value, options, onChange, placeholder = 'Select', searchable, required, hint, error, style, renderValue, icon, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = options.find((o) => o.value === value);
  const filtered = useMemo(() => (q ? options.filter((o) => `${o.label} ${t(o.label)} ${o.sub || ''}`.toLowerCase().includes(q.toLowerCase())) : options), [q, options]);
  const close = () => {
    setOpen(false);
    setQ('');
  };
  return (
    <>
      <FieldButton label={label ? t(label) : undefined} value={current ? (renderValue ? renderValue(current) : t(current.label)) : ''} placeholder={t(placeholder)} onPress={() => setOpen(true)} required={required} hint={hint} error={error} style={style} icon={icon} disabled={disabled} />
      <Sheet visible={open} onClose={close} title={t(label || placeholder)} full={options.length > 8}>
        {(searchable || options.length > 10) && (
          <View style={{ paddingHorizontal: space.lg }}>
            <Input placeholder={t('Search…')} value={q} onChangeText={setQ} icon="search" />
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(o) => String(o.value)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableRipple
              onPress={() => {
                onChange(item.value, item);
                close();
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: item.value === value }}
            >
              <View style={s.option}>
                {item.icon ? <Ionicons name={item.icon} size={22} color={item.value === value ? colors.primary : colors.sub} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[font.body, item.value === value && { fontWeight: '600' }]}>{t(item.label)}</Text>
                  {item.sub ? <Text style={font.small}>{item.sub}</Text> : null}
                </View>
                <RadioButton.Android value={String(item.value)} status={item.value === value ? 'checked' : 'unchecked'} onPress={() => (onChange(item.value, item), close())} color={colors.primary} />
              </View>
            </TouchableRipple>
          )}
          ListEmptyComponent={<Empty text={t('Nothing found')} />}
        />
      </Sheet>
    </>
  );
}

/** Field label shown above chip groups, segmented buttons and other non-text fields. */
export const FieldLabel = ({ label, required, style }) =>
  label ? (
    <Text style={[s.fieldLabel, style]}>
      {label}
      {required && <Text style={{ color: colors.primary }}>{' *'}</Text>}
    </Text>
  ) : null;

/** Filter / choice chips. multiple=true → value is an array. */
export function Chips({ label, options, value, onChange, multiple, required, hint, error }) {
  const selected = (v) => (multiple ? (value || []).includes(v) : value === v);
  const toggle = (v) => (multiple ? onChange(selected(v) ? value.filter((x) => x !== v) : [...(value || []), v]) : onChange(v));
  return (
    <View style={{ marginBottom: space.md }}>
      <FieldLabel label={label} required={required} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((o) => {
          const on = selected(o.value);
          return (
            <Chip
              key={String(o.value)}
              mode="outlined"
              selected={on}
              showSelectedCheck={multiple}
              icon={o.icon && !(on && multiple) ? ion(o.icon) : undefined}
              onPress={() => toggle(o.value)}
              style={[{ borderRadius: radius.sm, backgroundColor: on ? colors.primarySoft : colors.card, borderColor: on ? colors.primary : colors.border }]}
              textStyle={{ color: on ? colors.primaryDark : colors.text, fontWeight: on ? '600' : '400' }}
              selectedColor={colors.primaryDark}
              accessibilityState={{ selected: on }}
            >
              {t(o.label)}
            </Chip>
          );
        })}
      </View>
      {error ? <HelperText type="error" style={s.helper}>{error}</HelperText> : hint ? <HelperText type="info" style={s.helper}>{hint}</HelperText> : null}
    </View>
  );
}

/** 2–4 mutually exclusive options side by side (MUI ToggleButtonGroup). */
export function Segmented({ label, value, onChange, options, required, hint, style }) {
  return (
    <View style={[{ marginBottom: space.md }, style]}>
      <FieldLabel label={label} required={required} />
      <SegmentedButtons
        value={value}
        onValueChange={onChange}
        density="regular"
        buttons={options.map((o) => ({ value: o.value, label: t(o.label), icon: ion(o.icon), showSelectedCheck: false, checkedColor: colors.primaryDark, style: { borderColor: colors.border, backgroundColor: value === o.value ? colors.primarySoft : colors.card }, labelStyle: { fontWeight: value === o.value ? '700' : '500' } }))}
      />
      {hint ? <HelperText type="info" style={s.helper}>{hint}</HelperText> : null}
    </View>
  );
}

/** Large selectable cards (one choice), e.g. vehicle category. */
export function ChoiceCards({ label, value, onChange, options, required }) {
  return (
    <View style={{ marginBottom: space.md }}>
      <FieldLabel label={label} required={required} />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {options.map((o) => {
          const on = value === o.value;
          return (
            <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[s.choice, on && s.choiceOn, o.disabled && { opacity: 0.45 }]} disabled={o.disabled}>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={[s.choiceIcon, on && { backgroundColor: colors.primary }]}>
                  <Ionicons name={o.icon} size={22} color={on ? '#fff' : colors.primary} />
                </View>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.primary : colors.faint} />
              </Row>
              <Text style={[font.h3, { marginTop: space.sm }]}>{t(o.label)}</Text>
              {o.sub ? <Text style={font.small}>{t(o.sub)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleRow({ title, sub, value, onChange, disabled, icon }) {
  return (
    <TouchableRipple onPress={() => !disabled && onChange(!value)} disabled={disabled} style={[s.toggleRow, disabled && { opacity: 0.5 }]} accessibilityRole="switch" accessibilityState={{ checked: !!value }}>
      <Row gap={space.md}>
        {icon && <Ionicons name={icon} size={22} color={value ? colors.green : colors.sub} />}
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{title}</Text>
          {sub ? <Text style={font.small}>{sub}</Text> : null}
        </View>
        <Switch value={!!value} onValueChange={onChange} disabled={disabled} color={colors.primary} />
      </Row>
    </TouchableRipple>
  );
}

export function Stepper({ label, value, onChange, min = 1, max = 50, sub }) {
  return (
    <View style={[s.toggleRow, { marginBottom: space.md }]}>
      <Row gap={space.sm}>
        <View style={{ flex: 1 }}>
          <Text style={font.h3}>{label}</Text>
          {sub ? <Text style={font.small}>{sub}</Text> : null}
        </View>
        <PIconButton mode="outlined" icon={ion('remove')} size={20} onPress={() => onChange(Math.max(min, value - 1))} disabled={value <= min} accessibilityLabel={t('Decrease')} style={{ margin: 0, borderColor: colors.border }} iconColor={colors.primary} />
        <Text style={[font.h2, { minWidth: 36, textAlign: 'center' }]} accessibilityLiveRegion="polite">
          {value}
        </Text>
        <PIconButton mode="outlined" icon={ion('add')} size={20} onPress={() => onChange(Math.min(max, value + 1))} disabled={value >= max} accessibilityLabel={t('Increase')} style={{ margin: 0, borderColor: colors.border }} iconColor={colors.primary} />
      </Row>
    </View>
  );
}

// ---------------- Display ----------------

const TONES = {
  green: [colors.greenSoft, colors.green],
  red: [colors.primarySoft, colors.primaryDark],
  amber: [colors.amberSoft, colors.amber],
  blue: [colors.blueSoft, colors.blue],
  gray: ['#F1F3F5', colors.sub],
};
const STATUS_TONE = { approved: 'green', accepted: 'green', paid: 'green', active: 'green', completed: 'blue', scheduled: 'blue', ongoing: 'amber', pending: 'amber', created: 'amber', rejected: 'red', cancelled: 'red', suspended: 'red', failed: 'red', expired: 'gray', unverified: 'gray' };

export function Badge({ status, text, tone, icon }) {
  const [bg, fg] = TONES[tone || STATUS_TONE[status] || 'gray'];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} /> : <View style={[s.badgeDot, { backgroundColor: fg }]} />}
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{text || STATUS_TEXT[status] || titleCase(status)}</Text>
    </View>
  );
}

export function Stat({ label, value, sub, icon, tone = 'red', onPress, style }) {
  const [bg, fg] = TONES[tone];
  return (
    <Card style={[{ flex: 1, padding: space.md }, style]} onPress={onPress}>
      <Row style={{ justifyContent: 'space-between' }}>
        {icon && (
          <View style={{ backgroundColor: bg, borderRadius: 10, padding: 7 }}>
            <Ionicons name={icon} size={18} color={fg} />
          </View>
        )}
        {onPress && <Ionicons name="chevron-forward" size={16} color={colors.faint} />}
      </Row>
      <Text style={[font.h1, { marginTop: space.sm }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[font.sub, { color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
        {label}
      </Text>
      {sub ? (
        <Text style={font.small} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </Card>
  );
}

export const Empty = ({ icon = 'file-tray-outline', text, title, action }) => (
  <View style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 10 }}>
    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={34} color={colors.faint} />
    </View>
    {title ? <Text style={[font.h3, { textAlign: 'center' }]}>{title}</Text> : null}
    {text ? <Text style={[font.sub, { textAlign: 'center' }]}>{text}</Text> : null}
    {action}
  </View>
);

export const Loading = ({ full }) => (
  <View style={[{ padding: 40, alignItems: 'center' }, full && { flex: 1, justifyContent: 'center', backgroundColor: colors.bg }]}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const ErrorView = ({ message, onRetry }) => <Empty icon="cloud-offline-outline" text={message || t('Could not load. Check your internet.')} action={onRetry && <Button small variant="secondary" icon="refresh" title={t('Try again')} onPress={onRetry} />} />;

/** Inline alert (MUI Alert, "standard" variant). */
export const Notice = ({ tone = 'amber', icon = 'information-circle', title, text, action, style }) => {
  const [bg, fg] = TONES[tone];
  return (
    <View style={[s.notice, { backgroundColor: bg, borderColor: `${fg}33` }, style]}>
      <Ionicons name={icon} size={22} color={fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title && <Text style={{ color: fg, fontWeight: '700', fontSize: 15, lineHeight: 21 }}>{title}</Text>}
        {text ? <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{text}</Text> : null}
        {action}
      </View>
    </View>
  );
};

/** Horizontal stepper for the registration flow (MUI Stepper with alternative labels). */
export function ProgressSteps({ steps, current }) {
  const idx = Math.max(0, steps.findIndex((x) => x.key === current));
  return (
    <View style={{ marginBottom: space.lg }}>
      <Row gap={0} style={{ alignItems: 'center' }}>
        {steps.map((st, i) => {
          const done = i < idx;
          const on = i === idx;
          return (
            <React.Fragment key={st.key}>
              {i > 0 && <View style={{ flex: 1, height: 2, backgroundColor: i <= idx ? colors.primary : colors.border }} />}
              <View style={[s.stepDot, (done || on) && { backgroundColor: colors.primary, borderColor: colors.primary }]} accessibilityLabel={`${t('Step')} ${i + 1}: ${t(st.label)}`}>
                {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Text style={{ color: on ? '#fff' : colors.sub, fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>}
              </View>
            </React.Fragment>
          );
        })}
      </Row>
      <Text style={[font.small, { marginTop: space.sm, fontWeight: '600' }]}>
        {t('Step')} {idx + 1} {t('of')} {steps.length} · <Text style={{ color: colors.primary }}>{t(steps[idx]?.label)}</Text>
      </Text>
    </View>
  );
}

export const KV = ({ label, value, mono }) => (
  <Row style={{ justifyContent: 'space-between', paddingVertical: 7, alignItems: 'flex-start' }}>
    <Text style={font.sub}>{label}</Text>
    <Text style={[font.body, { flex: 1, textAlign: 'right', fontWeight: '500' }, mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 }]}>{value ?? '—'}</Text>
  </Row>
);

export const MenuItem = ({ icon, title, sub, onPress, right, danger }) => (
  <TouchableRipple onPress={onPress} accessibilityRole="button">
    <View style={s.menuItem}>
      <View style={[s.menuIcon, danger && { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={20} color={danger ? colors.primaryDark : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[font.h3, { fontWeight: '500' }, danger && { color: colors.primaryDark }]}>{title}</Text>
        {sub ? <Text style={font.small}>{sub}</Text> : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
    </View>
  </TouchableRipple>
);

/** Dialog with a text box (reject / cancel reasons) and quick presets. */
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
    <Portal>
      <Dialog visible={visible} onDismiss={onClose} style={{ backgroundColor: colors.card, borderRadius: radius.xl }}>
        <Dialog.Title style={font.h2}>{title}</Dialog.Title>
        <Dialog.Content>
          {message && <Text style={[font.sub, { marginBottom: space.md }]}>{message}</Text>}
          {presets.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space.md }}>
              {presets.map((p) => (
                <Chip key={p} mode="outlined" selected={text === t(p)} onPress={() => setText(t(p))} style={{ borderRadius: radius.sm }}>
                  {t(p)}
                </Chip>
              ))}
            </View>
          )}
          <Input placeholder={placeholder} label={t('Reason')} value={text} onChangeText={setText} multiline maxLength={250} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button title={t('Back')} variant="ghost" onPress={onClose} small />
          <Button title={t(confirmText)} variant={danger ? 'primary' : 'success'} loading={busy} disabled={required && text.trim().length < 3} onPress={submit} small />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.lg, minHeight: 60, paddingVertical: space.xs, backgroundColor: colors.bg },
  footer: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.md, backgroundColor: colors.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, ...shadow },
  cardOutlined: { borderWidth: 1, borderColor: colors.border, elevation: 0, shadowOpacity: 0 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.sub, marginBottom: space.sm },
  helper: { paddingHorizontal: 4, paddingVertical: 0, marginTop: 2 },
  // Kept for screens that draw their own field (PlaceInput, web date input).
  label: { fontSize: 13, fontWeight: '600', color: colors.sub, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12, minHeight: 48 },
  option: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.lg, paddingRight: space.sm, minHeight: 56, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
  choice: { flex: 1, padding: space.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  toggleRow: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space.md, paddingVertical: space.md, marginBottom: space.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  notice: { flexDirection: 'row', gap: 10, padding: space.md, borderRadius: radius.md, borderWidth: 1, marginBottom: space.lg, alignItems: 'flex-start' },
  stepDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: space.lg, backgroundColor: colors.card },
  menuIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: space.sm },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: space.sm },
});
