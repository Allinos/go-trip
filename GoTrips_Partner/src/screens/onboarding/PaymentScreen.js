import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Notice, ProgressSteps, Row, Screen } from '../../components/ui';
import { partnerApi, paymentApi } from '../../api';
import { errorMessage, errorCode } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdvance, progressSteps } from './flow';
import { colors, font } from '../../theme';
import { fullDate, paise } from '../../utils/format';

const BENEFITS = ['Your profile listed on the GoTrip driver marketplace', 'Customers call you directly — no commission on your work', 'Verified badge after document check', 'Profile views and call statistics'];

/**
 * Registration / renewal fee. Razorpay Checkout runs in a WebView (native) or browser tab (web).
 * The server verifies the payment with Razorpay before activating anything.
 */
export default function PaymentScreen({ navigation, route }) {
  const renew = route.params?.renew;
  const { onboarding, logout, setOnboardingState } = useAuth();
  const toast = useToast();
  const advance = useAdvance(navigation);
  const step = onboarding?.steps?.find((x) => x.key === 'payment');
  const amount = step?.amount || onboarding?.category?.registrationFee;
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // paymentId awaiting confirmation
  const [message, setMessage] = useState(route.params?.message || null);
  const poll = useRef();

  const done = useCallback(
    (state) => {
      clearInterval(poll.current);
      toast('Payment successful 🎉', 'success');
      if (renew) {
        setOnboardingState(state);
        navigation.goBack();
      } else advance(state);
    },
    [advance, navigation, renew, setOnboardingState, toast]
  );

  // Result coming back from the WebView screen.
  useEffect(() => {
    const r = route.params?.result;
    if (!r) return;
    if (r.status === 'paid') done(r.onboarding);
    else if (r.status === 'processing') setPending(r.paymentId);
    else if (r.message) setMessage(r.message);
  }, [route.params?.result]); // eslint-disable-line react-hooks/exhaustive-deps

  const check = useCallback(
    async (id = pending, quiet) => {
      try {
        const r = await paymentApi.status(id);
        if (r.data.status === 'paid') done(r.data.onboarding);
        else if (r.data.status === 'failed') {
          setPending(null);
          setMessage(r.data.payment.failureReason || 'Payment failed. You can try again.');
        } else if (!quiet) setMessage('Payment is still being confirmed. This can take a minute.');
      } catch (e) {
        if (!quiet) toast(errorMessage(e), 'error');
      }
    },
    [done, pending, toast]
  );

  useEffect(() => {
    if (!pending) return undefined;
    poll.current = setInterval(() => check(pending, true), 5000);
    return () => clearInterval(poll.current);
  }, [pending, check]);

  const pay = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const { data: order } = await paymentApi.createOrder();
      if (Platform.OS === 'web') {
        await Linking.openURL(order.checkoutUrl);
        setPending(order.paymentId);
      } else {
        navigation.navigate('PaymentWebView', { order, returnTo: route.name });
      }
    } catch (e) {
      if (errorCode(e) === 'ALREADY_PAID') {
        done((await partnerApi.onboarding()).data);
      } else setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={renew ? 'Renew listing' : 'Partner registration'}
      back={!!renew}
      right={!renew && <Button title="Log out" variant="ghost" small onPress={logout} />}
      footer={
        <View style={{ gap: 8 }}>
          <Button title={`Pay ${paise(amount)} securely`} icon="lock-closed" onPress={pay} loading={busy} />
          {pending && <Button title="I have paid — check status" variant="secondary" onPress={() => check()} />}
        </View>
      }
    >
      {!renew && <ProgressSteps steps={progressSteps(onboarding)} current="payment" />}
      <Text style={[font.h1, { marginTop: 8 }]}>{renew ? 'Renew your listing' : 'Activate your listing'}</Text>
      <Text style={[font.sub, { marginTop: 6, marginBottom: 16 }]}>
        {step?.expired ? 'Your listing has expired. Renew to appear on the marketplace again.' : 'One registration fee. Your registration is saved, so you can pay now or come back later.'}
      </Text>
      {message && <Notice tone="red" icon="alert-circle" text={message} />}
      {pending && <Notice tone="blue" icon="time" title="Confirming payment…" text="If money was deducted, it will be confirmed automatically. You can safely wait here." />}
      <Card style={{ marginBottom: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={font.h3}>{onboarding?.category?.name} registration</Text>
          <Text style={[font.h1, { color: colors.primary }]}>{paise(amount)}</Text>
        </Row>
        <Text style={[font.small, { marginTop: 4 }]}>
          {step?.validityDays ? `Valid for ${step.validityDays === 365 ? '1 year' : `${step.validityDays} days`}` : 'One-time fee'}
          {onboarding?.listing?.expiresAt ? ` · current listing ends ${fullDate(onboarding.listing.expiresAt)}` : ''}
        </Text>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
        {BENEFITS.map((b) => (
          <Row key={b} style={{ marginBottom: 8, alignItems: 'flex-start' }}>
            <Ionicons name="checkmark-circle" size={18} color={colors.green} />
            <Text style={[font.body, { flex: 1 }]}>{b}</Text>
          </Row>
        ))}
      </Card>
      <Row style={{ justifyContent: 'center' }}>
        <Ionicons name="shield-checkmark" size={16} color={colors.sub} />
        <Text style={font.small}>Secured by Razorpay · UPI, cards, net banking</Text>
      </Row>
    </Screen>
  );
}
