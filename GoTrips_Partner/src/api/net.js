/**
 * Connectivity: tells the app when the phone comes back online (or back to the foreground),
 * so the session and the open screens can sync without asking the user to log in again.
 */
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const listeners = new Set();
let online = true;
let lastFire = 0;

const fire = () => {
  if (Date.now() - lastFire < 3000) return; // NetInfo and AppState often fire together
  lastFire = Date.now();
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
};

NetInfo.addEventListener((s) => {
  const now = s.isConnected !== false && s.isInternetReachable !== false;
  if (now && !online) fire();
  online = now;
});
AppState.addEventListener('change', (st) => st === 'active' && online && fire());

export const isOnline = () => online;
/** fn() runs whenever connectivity is restored or the app returns to the foreground. Returns an unsubscribe. */
export function onReconnect(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
