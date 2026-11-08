import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Card, Chip, Header, Input, Row } from '../components/ui';
import useFetch from '../hooks/useFetch';
import useAuthStore from '../store/authStore';
import useRequireLogin from '../hooks/useRequireLogin';
import { catalogAPI, errorMessage, userAPI } from '../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { dateLabel } from '../utils/format';

const CATS = [['booking', 'Booking'], ['payment', 'Payment'], ['account', 'Account'], ['app_issue', 'App problem'], ['other', 'Other']];

export default function Support() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const requireLogin = useRequireLogin();
  const faqs = useFetch(() => catalogAPI.faqs());
  const tickets = useFetch(() => userAPI.tickets(), [isAuthenticated], { enabled: isAuthenticated });
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ category: 'booking', subject: '', message: '' });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await userAPI.createTicket(f);
      setForm(false);
      setF({ category: 'booking', subject: '', message: '' });
      tickets.reload();
      Alert.alert('Sent', 'Our team will reply soon.');
    } catch (e) {
      Alert.alert('Error', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
      <Header title="Help & support" />
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 40 }}>
        {form ? (
          <Card style={{ marginBottom: SPACING.md }}>
            <Row style={{ flexWrap: 'wrap', marginBottom: SPACING.md }}>
              {CATS.map(([v, l]) => (
                <Chip key={v} label={l} active={f.category === v} onPress={() => setF({ ...f, category: v })} />
              ))}
            </Row>
            <Input label="Subject" value={f.subject} onChangeText={(subject) => setF({ ...f, subject })} />
            <Input label="Describe the problem" value={f.message} onChangeText={(message) => setF({ ...f, message })} multiline />
            <Row>
              <Button style={{ flex: 1 }} small variant="outline" title="Cancel" onPress={() => setForm(false)} />
              <Button style={{ flex: 1 }} small title="Send" loading={busy} disabled={f.subject.trim().length < 3 || f.message.trim().length < 10} onPress={submit} />
            </Row>
          </Card>
        ) : (
          <Button title="Contact support" icon="support-agent" onPress={() => requireLogin(() => setForm(true), 'to contact support')} style={{ marginBottom: SPACING.md }} />
        )}
        {tickets.data?.length > 0 && (
          <>
            <Text style={[TYPOGRAPHY.h4, { marginBottom: 8 }]}>My tickets</Text>
            {tickets.data.map((t) => (
              <Card key={t.id} style={{ marginBottom: 8 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={[TYPOGRAPHY.bodyBold, { flex: 1 }]}>{t.subject}</Text>
                  <Text style={[TYPOGRAPHY.small, { color: COLORS.text.secondary }]}>{t.status.replace('_', ' ')}</Text>
                </Row>
                <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{dateLabel(t.createdAt)}</Text>
                {t.adminReply && <Text style={[TYPOGRAPHY.caption, { marginTop: 6, color: COLORS.success }]}>GoTrip: {t.adminReply}</Text>}
              </Card>
            ))}
          </>
        )}
        <Text style={[TYPOGRAPHY.h4, { marginVertical: 8 }]}>FAQs</Text>
        {(faqs.data || []).map((q) => (
          <Card key={q.id} style={{ marginBottom: 8 }} onPress={() => setOpen(open === q.id ? null : q.id)}>
            <Row>
              <Text style={[TYPOGRAPHY.bodyBold, { flex: 1 }]}>{q.question}</Text>
              <MaterialIcons name={open === q.id ? 'expand-less' : 'expand-more'} size={22} color={COLORS.text.secondary} />
            </Row>
            {open === q.id && <Text style={[TYPOGRAPHY.caption, { color: COLORS.text.secondary, marginTop: 6 }]}>{q.answer}</Text>}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
