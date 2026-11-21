import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, Text, View } from 'react-native';
import { TextInput, TouchableRipple } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '../theme';
import { FieldButton, FieldLabel, Input, Row, Select, Sheet, s } from './ui';
import { catalogApi } from '../api';
import { useCatalog } from '../context/AuthContext';
import { t } from '../i18n';
import CachedImage from './CachedImage';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date and/or time picker. value: Date | null. mode: 'date' | 'time' | 'datetime'. */
export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, required, hint }) {
  const [show, setShow] = useState(null); // 'date' | 'time'
  const text = !value
    ? mode === 'time'
      ? t('Choose time')
      : t('Choose date')
    : mode === 'time'
      ? value.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
      : mode === 'datetime'
        ? `${value.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${value.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}`
        : value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (Platform.OS === 'web') {
    // Browser fallback (used only for testing the app on the web).
    const type = mode === 'datetime' ? 'datetime-local' : mode;
    const v = value ? (mode === 'time' ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : mode === 'datetime' ? `${isoDate(value)}T${pad(value.getHours())}:${pad(value.getMinutes())}` : isoDate(value)) : '';
    return (
      <View style={{ marginBottom: space.md }}>
        <FieldLabel label={label} required={required} />
        {React.createElement('input', {
          type,
          value: v,
          'aria-label': label,
          onChange: (e) => {
            const x = e.target.value;
            if (!x) return onChange(null);
            if (mode === 'time') {
              const [h, m] = x.split(':');
              const d = new Date(value || Date.now());
              d.setHours(+h, +m, 0, 0);
              onChange(d);
            } else onChange(new Date(mode === 'date' ? `${x}T00:00:00` : x));
          },
          style: { fontSize: 16, padding: '12px 14px', borderRadius: 12, border: `1px solid ${colors.border}`, fontFamily: 'inherit', color: colors.text, background: colors.card, minHeight: 48 },
        })}
        {hint && <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text>}
      </View>
    );
  }

  return (
    <View>
      <FieldButton label={label} required={required} hint={hint} value={value ? text : ''} placeholder={text} icon={mode === 'time' ? 'time-outline' : 'calendar-outline'} rightIcon="chevron-down" onPress={() => setShow(mode === 'time' ? 'time' : 'date')} />
      {show && (
        <DateTimePicker
          value={value || minimumDate || new Date()}
          mode={show}
          minimumDate={show === 'date' ? minimumDate : undefined}
          maximumDate={show === 'date' ? maximumDate : undefined}
          onChange={(e, d) => {
            const step = show;
            setShow(null);
            if (e.type === 'dismissed' || !d) return;
            if (mode === 'datetime' && step === 'date') {
              const base = value || new Date();
              d.setHours(base.getHours(), base.getMinutes(), 0, 0);
              onChange(d);
              setTimeout(() => setShow('time'), 50);
            } else onChange(d);
          }}
        />
      )}
    </View>
  );
}

export const toIsoDate = (d) => (d ? isoDate(d) : null);

/**
 * Photo of a document or vehicle, from the camera or the gallery. value: { uri, type } | null.
 * Also shows an already uploaded file (url). The source is chosen in a bottom sheet.
 */
export function ImageField({ label, value, url, onChange, hint, required, compact }) {
  const [choose, setChoose] = useState(false);
  const pick = async (camera) => {
    setChoose(false);
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert(t('Permission needed'), t('Please allow {0} access in settings.', [camera ? 'camera' : 'photo']));
    const fn = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false });
    if (!res.canceled && res.assets?.[0]) onChange({ uri: res.assets[0].uri, type: res.assets[0].mimeType || 'image/jpeg' });
  };
  const shown = value?.uri || url;
  const isPdf = shown && /\.pdf(\?|$)/i.test(shown);
  const fresh = !!value?.uri;
  return (
    <View style={{ marginBottom: space.md, flex: compact ? 1 : undefined }}>
      <FieldLabel label={label} required={required} />
      <Pressable
        onPress={() => (Platform.OS === 'web' ? pick(false) : setChoose(true))}
        style={[fieldStyles.photo, compact && { height: 120 }, shown ? { borderStyle: 'solid', borderColor: fresh ? colors.green : colors.border, backgroundColor: colors.surfaceVariant } : null]}
        accessibilityRole="button"
        accessibilityLabel={t('Upload {0}', [label])}
      >
        {shown && !isPdf ? (
          <CachedImage uri={shown} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View style={{ alignItems: 'center', gap: 6, padding: 8 }}>
            <View style={fieldStyles.photoIcon}>
              <Ionicons name={isPdf ? 'document-text' : 'camera'} size={24} color={colors.primary} />
            </View>
            <Text style={{ color: colors.primary, fontWeight: '600', textAlign: 'center' }}>{isPdf ? t('PDF uploaded · tap to replace') : t('Tap to add photo')}</Text>
            {!compact && <Text style={[font.small, { textAlign: 'center' }]}>{t('Camera or gallery · JPG, PNG')}</Text>}
          </View>
        )}
        {shown && !isPdf && (
          <View style={fieldStyles.photoTag}>
            <Ionicons name={fresh ? 'checkmark-circle' : 'sync'} size={13} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{fresh ? t('Ready to upload') : t('Change')}</Text>
          </View>
        )}
      </Pressable>
      {hint ? <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text> : null}
      <Sheet visible={choose} onClose={() => setChoose(false)} title={label || t('Add photo')}>
        <Text style={[font.sub, { paddingHorizontal: space.lg, marginBottom: space.sm }]}>{t('Take a clear photo in good light')}</Text>
        {[
          ['camera-outline', t('Take photo'), true],
          ['images-outline', t('Choose from gallery'), false],
        ].map(([icon, text, camera]) => (
          <TouchableRipple key={icon} onPress={() => pick(camera)}>
            <Row style={{ paddingHorizontal: space.lg, minHeight: 56 }} gap={space.lg}>
              <Ionicons name={icon} size={24} color={colors.text} />
              <Text style={font.body}>{text}</Text>
            </Row>
          </TouchableRipple>
        ))}
      </Sheet>
    </View>
  );
}

const fieldStyles = {
  photo: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primaryBorder, borderRadius: radius.md, height: 150, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  photoIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  photoTag: { position: 'absolute', right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(17,24,39,0.72)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
};

/** District dropdown backed by the server list. */
export function DistrictSelect({ label = 'District', value, onChange, required, hint, error }) {
  const { districts } = useCatalog();
  return <Select label={label} required={required} hint={hint} error={error} value={value} onChange={onChange} searchable icon="map-outline" placeholder={t('Choose district')} options={(districts || []).map((d) => ({ value: d.name, label: d.name }))} />;
}

const placeNorm = (x) => String(x || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** All predefined places (from the catalog) as { placeId, name, district, lat, lng }. */
export function usePlaces() {
  const { districts } = useCatalog();
  return React.useMemo(() => (districts || []).flatMap((d) => (d.places || []).map((p) => ({ placeId: p.id, name: p.name, district: d.name, lat: p.lat, lng: p.lng, key: placeNorm(p.name) }))), [districts]);
}

/**
 * Place picker for trip stops: only the predefined towns and points can be chosen (customers search the
 * same list). onChange(name, { placeId, district, lat, lng }). Works offline (the list comes with the catalog).
 */
export function PlaceSelect({ label, value, district, onChange, placeholder = 'Choose a place', icon = 'location', iconColor = colors.primary, error, disabled }) {
  const places = usePlaces();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const list = React.useMemo(() => {
    const k = placeNorm(q);
    if (k.length < 2) return places;
    // Exact name, then names starting with the text, then word starts, then places in a matching district.
    const rank = (p) => (p.key === k ? 0 : p.key.startsWith(k) ? 1 : p.key.includes(` ${k}`) ? 2 : p.key.includes(k) ? 3 : placeNorm(p.district).startsWith(k) ? 4 : 9);
    return places.map((p) => [rank(p), p]).filter(([r]) => r < 9).sort((a, b) => a[0] - b[0]).map(([, p]) => p);
  }, [q, places]);
  const close = () => (setOpen(false), setQ(''));
  return (
    <>
      <FieldButton label={label} value={value ? `${value}${district ? ` · ${district}` : ''}` : ''} placeholder={t(placeholder)} icon={icon} onPress={() => setOpen(true)} error={error} disabled={disabled} />
      <Sheet visible={open} onClose={close} title={label || t(placeholder)} full>
        <View style={{ paddingHorizontal: space.lg }}>
          <Input placeholder={t('Search town or place')} value={q} onChangeText={setQ} icon="search" autoFocus />
        </View>
        <FlatList
          data={list.slice(0, 80)}
          keyExtractor={(p) => String(p.placeId)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableRipple onPress={() => (onChange(item.name, { placeId: item.placeId, district: item.district, lat: item.lat, lng: item.lng }), close())}>
              <Row style={{ paddingHorizontal: space.lg, minHeight: 54, borderBottomWidth: 1, borderBottomColor: colors.divider }} gap={12}>
                <Ionicons name="location-outline" size={20} color={iconColor} />
                <View style={{ flex: 1 }}>
                  <Text style={font.body}>{item.name}</Text>
                  <Text style={font.small}>{item.district}</Text>
                </View>
                {item.name === value && item.district === district && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Row>
            </TouchableRipple>
          )}
          ListEmptyComponent={<Text style={[font.sub, { padding: space.lg }]}>{places.length ? t('No place with this name. Choose the nearest town.') : t('Loading places…')}</Text>}
        />
      </Sheet>
    </>
  );
}

/**
 * Place input with suggestions (major points + districts). Free text is allowed so partners can type any village.
 * onChange(text, meta?) where meta = { district, lat, lng } when a suggestion is chosen.
 */
export function PlaceInput({ label, value, onChange, placeholder = 'Type a place name', icon = 'location', iconColor = colors.primary, error }) {
  const [items, setItems] = useState([]);
  const [focus, setFocus] = useState(false);
  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer.current);
    if (!focus || !value || value.trim().length < 2) return setItems([]);
    timer.current = setTimeout(() => {
      catalogApi
        .searchPlaces(value.trim())
        .then((r) => setItems(r.data.slice(0, 6)))
        .catch(() => setItems([]));
    }, 300);
    return () => clearTimeout(timer.current);
  }, [value, focus]);
  return (
    <View style={{ marginBottom: space.md, zIndex: focus ? 10 : 0 }}>
      <TextInput
        mode="outlined"
        dense
        label={label}
        accessibilityLabel={label}
        value={value}
        onChangeText={(v) => onChange(v)}
        placeholder={t(placeholder)}
        placeholderTextColor={colors.faint}
        error={!!error}
        left={<TextInput.Icon icon={({ size }) => <Ionicons name={icon} size={size} color={iconColor} />} />}
        outlineStyle={{ borderRadius: radius.md }}
        style={{ backgroundColor: colors.card, fontSize: 16 }}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 200)}
      />
      {focus && items.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' }}>
          {items.map((it) => (
            <TouchableRipple
              key={`${it.type}-${it.id || it.name}`}
              onPress={() => {
                onChange(it.name, { district: it.district, lat: it.lat, lng: it.lng });
                setItems([]);
                setFocus(false);
              }}
              style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider }}
            >
              <Row>
                <Ionicons name={it.type === 'district' ? 'map-outline' : 'location-outline'} size={16} color={colors.sub} />
                <Text style={font.body}>{it.name}</Text>
                {it.type === 'place' && <Text style={font.small}>{'· '}{it.district}</Text>}
              </Row>
            </TouchableRipple>
          ))}
        </View>
      )}
      {error ? <Text style={[font.small, { color: colors.primaryDark, marginTop: 2, marginLeft: 4 }]}>{error}</Text> : null}
    </View>
  );
}

export { Input };
