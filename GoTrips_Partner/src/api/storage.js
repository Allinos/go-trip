import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Tokens live in the device keystore (SecureStore). Web (used only for testing) falls back to localStorage.
const web = Platform.OS === 'web';
export const secure = {
  get: (k) => (web ? Promise.resolve(globalThis.localStorage?.getItem(k) ?? null) : SecureStore.getItemAsync(k)),
  set: (k, v) => (web ? Promise.resolve(globalThis.localStorage?.setItem(k, v)) : SecureStore.setItemAsync(k, v)),
  del: (k) => (web ? Promise.resolve(globalThis.localStorage?.removeItem(k)) : SecureStore.deleteItemAsync(k)),
};
