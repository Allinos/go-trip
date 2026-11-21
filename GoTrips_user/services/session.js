/**
 * The last signed-in profile, kept on the phone so the app opens straight into the account after a restart,
 * also with no internet. Tokens themselves live in the keystore (see client.js); this is only display data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gt_user_session';
export const saveSession = (data) => AsyncStorage.setItem(KEY, JSON.stringify({ at: Date.now(), data })).catch(() => {});
export const clearSession = () => AsyncStorage.removeItem(KEY).catch(() => {});
export async function loadSession() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw).data : null;
  } catch {
    return null;
  }
}
