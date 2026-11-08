import { Alert, Linking } from 'react-native';
import { marketplaceAPI, errorMessage } from '../services/api';
import { t } from '../i18n';

/** Ask the API for the number (records the call for partner stats) and open the dialer / WhatsApp. */
export async function contactPartner(targetType, targetId, channel = 'call') {
  try {
    const r = await marketplaceAPI.contact(targetType, targetId, channel);
    await Linking.openURL(channel === 'whatsapp' ? r.data.whatsappUrl : r.data.telUrl);
  } catch (e) {
    Alert.alert(t("Could not connect"), errorMessage(e));
  }
}
