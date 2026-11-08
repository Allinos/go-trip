import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function useNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const responseListener = useRef(null);
  const receiveListener = useRef(null);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) {
      return null;
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: undefined,
      });
      const t = token?.data;
      setExpoPushToken(t);
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      return t;
    } catch {
      return null;
    }
  };

  const setupNotificationListeners = () => {
    receiveListener.current?.remove?.();
    responseListener.current?.remove?.();
    receiveListener.current = Notifications.addNotificationReceivedListener((n) => {
      setNotification(n);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});
    return () => {
      receiveListener.current?.remove?.();
      responseListener.current?.remove?.();
    };
  };

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  return {
    expoPushToken,
    notification,
    registerForPushNotifications,
    setupNotificationListeners,
  };
}
