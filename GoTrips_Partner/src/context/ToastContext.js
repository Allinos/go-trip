import React, { createContext, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const fadeAnim = useState(new Animated.Value(0))[0];

  const showToast = useCallback((message, type = 'success') => {
    setToast({ visible: true, message, type });
    
    // Animate In
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      hideToast();
    }, 2000);
  }, []);

  const hideToast = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setToast({ ...toast, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }, styles[toast.type]]}>
          <SafeAreaView style={styles.content}>
            <Ionicons 
              name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
              size={20} 
              color="#FFF" 
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </SafeAreaView>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 12,
    zIndex: 9999,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  toastText: { color: '#FFF', fontWeight: '600', marginLeft: 10, fontSize: 14 },
  success: { backgroundColor: '#10B981' },
  error: { backgroundColor: '#EF5350' },
  info: { backgroundColor: '#3B82F6' },
});