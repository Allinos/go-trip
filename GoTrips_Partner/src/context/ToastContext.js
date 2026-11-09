import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

/** Snackbar-style messages (Material). toast(message, 'success' | 'error' | 'info'). */
const Ctx = createContext(() => {});
const ICON = { success: 'checkmark-circle', error: 'alert-circle', info: 'information-circle' };

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef();
  const insets = useSafeAreaInsets();
  const show = useCallback(
    (message, type = 'info') => {
      if (!message) return;
      clearTimeout(timer.current);
      const kind = ICON[type] ? type : 'info';
      setToast({ message: String(message), type: kind });
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null)), kind === 'error' ? 4500 : 3000);
    },
    [opacity]
  );
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 84, opacity }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1F2328', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 10, elevation: 6, boxShadow: '0 4px 12px rgba(0,0,0,.25)' }}>
            <Ionicons name={ICON[toast.type]} size={20} color={toast.type === 'error' ? '#FCA5A5' : toast.type === 'success' ? '#6EE7B7' : '#fff'} />
            <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20, fontWeight: '500', flex: 1 }}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
