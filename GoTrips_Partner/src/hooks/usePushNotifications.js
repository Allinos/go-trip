import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { meApi } from '../api';
import { navigate } from '../navigation/ref';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Map a notification's data payload to an app screen. */
function openFromData(data = {}) {
  if (data.bookingId) return navigate('BookingDetail', { id: Number(data.bookingId) });
  if (data.vehicleId) return navigate('VehicleDetail', { id: Number(data.vehicleId) });
  if (data.screen === 'Documents') return navigate('Documents');
  if (data.screen === 'Payments') return navigate('Payments');
  if (data.screen === 'Support') return navigate('Support');
  navigate('Notifications');
}

/**
 * Registers the FCM device token with the API once the partner is logged in.
 * Requires a development/production build with google-services.json (Expo Go cannot receive FCM on Android).
 */
export function usePushNotifications(enabled) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return undefined;
    let cancelled = false;
    (async () => {
      try {
        if (!Device.isDevice) return;
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', { name: 'Booking alerts', importance: Notifications.AndroidImportance.MAX, sound: 'default', vibrationPattern: [0, 300, 200, 300] });
        }
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
        if (status !== 'granted' || cancelled) return;
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        globalThis.__gtPushToken = token;
        await meApi.registerPush(token, Platform.OS);
      } catch (e) {
        console.log('Push registration skipped:', e?.message);
      }
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((r) => openFromData(r.notification.request.content.data));
    Notifications.getLastNotificationResponseAsync().then((r) => r && openFromData(r.notification.request.content.data));
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [enabled]);
}
