import { Alert, Platform } from 'react-native';
import { t } from '../i18n';

/**
 * Confirmation dialog that also works on web (Alert with buttons is a no-op in react-native-web).
 * confirm(title, message, { okText, destructive }) → Promise<boolean>
 */
export function confirm(title, message, { okText = 'OK', cancelText = 'Cancel', destructive } = {}) {
  if (Platform.OS === 'web') return Promise.resolve(globalThis.confirm?.(`${title}${message ? `\n\n${message}` : ''}`) ?? false);
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: t(cancelText), style: 'cancel', onPress: () => resolve(false) },
      { text: t(okText), style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) })
  );
}
