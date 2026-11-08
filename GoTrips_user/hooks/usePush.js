import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { userAPI } from '../services/api';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });

const open = (data = {}) => {
  if (data.bookingId) router.push(`/booking/${data.bookingId}`);
  else if (data.screen === 'Support') router.push('/support');
  else router.push('/notifications');
};

/** Register the FCM token after login; open the right screen when a notification is tapped. */
export default function usePush(enabled) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return undefined;
    (async () => {
      try {
        if (!Device.isDevice) return;
        if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Booking updates', importance: Notifications.AndroidImportance.HIGH });
        let { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
        if (status !== 'granted') return;
        const token = (await Notifications.getDevicePushTokenAsync()).data;
        globalThis.__gtPushToken = token;
        await userAPI.registerPush(token, Platform.OS);
      } catch (e) {
        console.log('push registration skipped', e?.message);
      }
    })();
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => sub.remove();
  }, [enabled]);
}
