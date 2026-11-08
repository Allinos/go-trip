import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Header, s } from '../../components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { paymentApi } from '../../api';
import { errorMessage } from '../../api/client';
import { colors } from '../../theme';
import { t } from '../../i18n';

/** Hosts the server's Razorpay Checkout page and verifies the result on the server. */
export default function PaymentWebViewScreen({ navigation, route }) {
  const { order, returnTo } = route.params;
  const [verifying, setVerifying] = useState(false);
  const handled = useRef(false);

  const finish = (result) => navigation.navigate(returnTo || 'Payment', { result, ts: Date.now() });

  const onMessage = async (e) => {
    let msg;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.status === 'success' && !handled.current) {
      handled.current = true;
      setVerifying(true);
      try {
        const r = await paymentApi.verify({ razorpayOrderId: msg.razorpayOrderId, razorpayPaymentId: msg.razorpayPaymentId, razorpaySignature: msg.razorpaySignature });
        finish({ status: r.data.status, onboarding: r.data.onboarding, paymentId: order.paymentId });
      } catch (err) {
        // Money may have been taken: let the payment screen keep checking (webhook will confirm).
        finish({ status: 'processing', paymentId: order.paymentId, message: errorMessage(err) });
      }
    } else if (msg.status === 'failed') {
      paymentApi.failed(order.paymentId, msg.reason).catch(() => {});
    } else if (msg.status === 'dismissed') {
      paymentApi.failed(order.paymentId, 'Cancelled by user').catch(() => {});
      finish({ status: 'cancelled', message: 'Payment was cancelled. You can try again any time.' });
    }
  };

  const close = () =>
    Alert.alert(t("Cancel payment?"), t("If you already paid, choose \"I have paid\"."), [
      { text: 'Continue paying', style: 'cancel' },
      { text: 'I have paid', onPress: () => finish({ status: 'processing', paymentId: order.paymentId }) },
      { text: 'Cancel', style: 'destructive', onPress: () => finish({ status: 'cancelled', message: 'Payment was cancelled.' }) },
    ]);

  return (
    <SafeAreaView style={s.screen}>
      <Header title={t("Secure payment")} onBack={close} />
      <WebView
        source={{ uri: order.checkoutUrl }}
        onMessage={onMessage}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        originWhitelist={['*']}
        // UPI apps (GPay, PhonePe, Paytm) open through upi:// / intent:// links: hand those to the OS.
        onShouldStartLoadWithRequest={(req) => {
          if (/^https?:/i.test(req.url) || req.url === 'about:blank') return true;
          Linking.openURL(req.url).catch(() => Alert.alert(t("App not found"), t("Please choose another payment method.")));
          return false;
        }}
      />
      {verifying && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </SafeAreaView>
  );
}
