import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

const Ctx = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef();
  const insets = useSafeAreaInsets();
  const show = useCallback(
    (message, type = 'info') => {
      clearTimeout(timer.current);
      setToast({ message, type });
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null)), 3200);
    },
    [opacity]
  );
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 80, opacity }}>
          <View style={{ backgroundColor: toast.type === 'error' ? colors.primaryDark : toast.type === 'success' ? colors.green : '#111827', padding: 14, borderRadius: 12 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
