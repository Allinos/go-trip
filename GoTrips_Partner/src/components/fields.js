import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors, font, radius, space } from '../theme';
import { Input, Row, Select, s } from './ui';
import { catalogApi } from '../api';
import { useCatalog } from '../context/AuthContext';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date and/or time picker. value: Date | null. mode: 'date' | 'time' | 'datetime'. */
export function DateField({ label, value, onChange, mode = 'date', minimumDate, maximumDate, required, hint }) {
  const [show, setShow] = useState(null); // 'date' | 'time'
  const text = !value
    ? mode === 'time'
      ? 'Choose time'
      : 'Choose date'
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
      <View style={{ marginBottom: space.lg }}>
        {label && <Text style={s.label}>{label}{required && <Text style={{ color: colors.primary }}> *</Text>}</Text>}
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
          style: { fontSize: 16, padding: 12, borderRadius: 12, border: `1.5px solid ${colors.border}`, fontFamily: 'inherit' },
        })}
        {hint && <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text>}
      </View>
    );
  }

  return (
    <View style={{ marginBottom: space.lg }}>
      {label && <Text style={s.label}>{label}{required && <Text style={{ color: colors.primary }}> *</Text>}</Text>}
      <Pressable style={s.inputWrap} onPress={() => setShow(mode === 'time' ? 'time' : 'date')} accessibilityRole="button">
        <Ionicons name={mode === 'time' ? 'time-outline' : 'calendar-outline'} size={20} color={colors.primary} />
        <Text style={[s.input, { paddingVertical: 14, marginLeft: 8, color: value ? colors.text : colors.faint }]}>{text}</Text>
      </Pressable>
      {hint && <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text>}
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

/** Pick a photo from camera or gallery. value: { uri } | null. Also shows an existing remote url. */
export function ImageField({ label, value, url, onChange, hint, required, allowPdf }) {
  const pick = async (camera) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Permission needed', `Please allow ${camera ? 'camera' : 'photo'} access in settings.`);
    const fn = camera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const res = await fn({ mediaTypes: ['images'], quality: 0.7, allowsEditing: false });
    if (!res.canceled && res.assets?.[0]) onChange({ uri: res.assets[0].uri, type: res.assets[0].mimeType || 'image/jpeg' });
  };
  const ask = () =>
    Platform.OS === 'web'
      ? pick(false)
      : Alert.alert(label || 'Add photo', 'Take a clear photo in good light', [
          { text: 'Camera', onPress: () => pick(true) },
          { text: 'Gallery', onPress: () => pick(false) },
          { text: 'Cancel', style: 'cancel' },
        ]);
  const shown = value?.uri || url;
  const isPdf = shown && /\.pdf(\?|$)/i.test(shown);
  return (
    <View style={{ marginBottom: space.lg }}>
      {label && <Text style={s.label}>{label}{required && <Text style={{ color: colors.primary }}> *</Text>}</Text>}
      <Pressable onPress={ask} style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: shown ? colors.border : colors.primaryBorder, borderRadius: radius.md, height: 150, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }} accessibilityRole="button" accessibilityLabel={`Upload ${label}`}>
        {shown && !isPdf ? (
          <Image source={{ uri: shown }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Ionicons name={isPdf ? 'document-text' : 'camera'} size={34} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>{isPdf ? 'PDF uploaded · tap to replace' : 'Tap to add photo'}</Text>
          </View>
        )}
        {shown && !isPdf && (
          <View style={{ position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>Change</Text>
          </View>
        )}
      </Pressable>
      {hint && <Text style={[font.small, { marginTop: 4 }]}>{hint}</Text>}
    </View>
  );
}

/** District dropdown backed by the server list. */
export function DistrictSelect({ label = 'District', value, onChange, required, hint }) {
  const { districts } = useCatalog();
  return <Select label={label} required={required} hint={hint} value={value} onChange={onChange} searchable placeholder="Choose district" options={(districts || []).map((d) => ({ value: d.name, label: d.name }))} />;
}

/**
 * Place input with suggestions (major points + districts). Free text is allowed so partners can type any village.
 * onChange(text, meta?) where meta = { district, lat, lng } when a suggestion is chosen.
 */
export function PlaceInput({ label, value, onChange, placeholder = 'Type a place name', icon = 'location', iconColor = colors.primary }) {
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
      {label && <Text style={s.label}>{label}</Text>}
      <View style={[s.inputWrap, focus && { borderColor: colors.primary }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
        <TextInput style={[s.input, { marginLeft: 8 }]} value={value} onChangeText={(t) => onChange(t)} placeholder={placeholder} placeholderTextColor={colors.faint} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 200)} />
      </View>
      {focus && items.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: 4, overflow: 'hidden' }}>
          {items.map((it) => (
            <Pressable
              key={`${it.type}-${it.id || it.name}`}
              onPress={() => {
                onChange(it.name, { district: it.district, lat: it.lat, lng: it.lng });
                setItems([]);
                setFocus(false);
              }}
              style={({ pressed }) => [{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Row>
                <Ionicons name={it.type === 'district' ? 'map-outline' : 'location-outline'} size={16} color={colors.sub} />
                <Text style={font.body}>{it.name}</Text>
                {it.type === 'place' && <Text style={font.small}>· {it.district}</Text>}
              </Row>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export { Input };
