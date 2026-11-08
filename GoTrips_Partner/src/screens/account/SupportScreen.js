import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Chips, Input, Loading, Row, Screen, Section } from '../../components/ui';
import { catalogApi, meApi } from '../../api';
import { errorMessage } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useToast } from '../../context/ToastContext';
import { colors, font } from '../../theme';
import { dateLabel } from '../../utils/format';

const CATS = [
  ['booking', 'Booking'], ['payment', 'Payment'], ['vehicle', 'Vehicle'], ['verification', 'Verification'], ['account', 'Account'], ['app_issue', 'App problem'], ['other', 'Other'],
].map(([value, label]) => ({ value, label }));

export default function SupportScreen() {
  const toast = useToast();
  const faqs = useApi(() => catalogApi.faqs());
  const tickets = useApi(() => meApi.tickets());
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ category: 'booking', subject: '', message: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await meApi.createTicket(f);
      toast('Ticket sent. We will reply soon.', 'success');
      setForm(false);
      setF({ category: 'booking', subject: '', message: '' });
      tickets.reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Help & support">
      <Section title="Need help?" icon="chatbubbles">
        {form ? (
          <Card>
            <Chips label="Topic" options={CATS} value={f.category} onChange={(category) => setF({ ...f, category })} />
            <Input label="Subject" value={f.subject} onChangeText={(subject) => setF({ ...f, subject })} placeholder="Short summary" />
            <Input label="Describe the problem" value={f.message} onChangeText={(message) => setF({ ...f, message })} multiline placeholder="At least 10 characters" />
            <Row>
              <Button small variant="ghost" title="Cancel" onPress={() => setForm(false)} />
              <Button small title="Send" style={{ flex: 1 }} loading={busy} disabled={f.subject.trim().length < 3 || f.message.trim().length < 10} onPress={submit} />
            </Row>
          </Card>
        ) : (
          <Button icon="create" title="Create a support ticket" onPress={() => setForm(true)} />
        )}
      </Section>
      <Section title="My tickets" icon="file-tray-full">
        {tickets.loading ? (
          <Loading />
        ) : tickets.data?.length ? (
          tickets.data.map((t) => (
            <Card key={t.id} style={{ marginBottom: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[font.h3, { flex: 1 }]}>{t.subject}</Text>
                <Badge status={t.status === 'resolved' ? 'approved' : t.status === 'open' ? 'pending' : t.status} text={t.status.replace('_', ' ')} />
              </Row>
              <Text style={font.small}>{dateLabel(t.createdAt)}</Text>
              {t.adminReply && (
                <View style={{ backgroundColor: colors.greenSoft, padding: 10, borderRadius: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.green, fontWeight: '700' }}>GoTrip support</Text>
                  <Text style={font.body}>{t.adminReply}</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Text style={font.sub}>No tickets yet.</Text>
        )}
      </Section>
      <Section title="Frequently asked questions" icon="help-circle">
        {(faqs.data || []).map((q) => (
          <Card key={q.id} style={{ marginBottom: 8 }} onPress={() => setOpen(open === q.id ? null : q.id)}>
            <Row>
              <Text style={[font.h3, { flex: 1 }]}>{q.question}</Text>
              <Ionicons name={open === q.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.sub} />
            </Row>
            {open === q.id && <Text style={[font.body, { marginTop: 8, color: colors.sub }]}>{q.answer}</Text>}
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
