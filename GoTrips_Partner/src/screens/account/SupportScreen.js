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
import { t } from '../../i18n';

const CATS = [
  ['booking', 'Booking'], ['payment', 'Payment'], ['vehicle', 'Vehicle'], ['verification', 'Verification'], ['account', 'Account'], ['app_issue', 'App problem'], ['other', 'Other'],
].map(([value, label]) => ({ value, label }));

export default function SupportScreen() {
  const toast = useToast();
  const faqs = useApi(() => catalogApi.faqs(), [], { cacheKey: 'faqs' });
  const tickets = useApi(() => meApi.tickets(), [], { cacheKey: 'tickets' });
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ category: 'booking', subject: '', message: '' });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await meApi.createTicket(f);
      toast(t("Ticket sent. We will reply soon."), 'success');
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
    <Screen title={t("Help & support")}>
      <Section title={t("Need help?")} icon="chatbubbles">
        {form ? (
          <Card>
            <Chips label={t("Topic")} options={CATS} value={f.category} onChange={(category) => setF({ ...f, category })} />
            <Input label={t("Subject")} value={f.subject} onChangeText={(subject) => setF({ ...f, subject })} placeholder={t("Short summary")} />
            <Input label={t("Describe the problem")} value={f.message} onChangeText={(message) => setF({ ...f, message })} multiline placeholder={t("At least 10 characters")} />
            <Row>
              <Button small variant="ghost" title={t("Cancel")} onPress={() => setForm(false)} />
              <Button small title={t("Send")} style={{ flex: 1 }} loading={busy} disabled={f.subject.trim().length < 3 || f.message.trim().length < 10} onPress={submit} />
            </Row>
          </Card>
        ) : (
          <Button icon="create" title={t("Create a support ticket")} onPress={() => setForm(true)} />
        )}
      </Section>
      <Section title={t("My tickets")} icon="file-tray-full">
        {tickets.loading ? (
          <Loading />
        ) : tickets.data?.length ? (
          tickets.data.map((tk) => (
            <Card key={tk.id} style={{ marginBottom: 8 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={[font.h3, { flex: 1 }]}>{tk.subject}</Text>
                <Badge status={tk.status === 'resolved' ? 'approved' : tk.status === 'open' ? 'pending' : tk.status} text={tk.status.replace('_', ' ')} />
              </Row>
              <Text style={font.small}>{dateLabel(tk.createdAt)}</Text>
              {tk.adminReply && (
                <View style={{ backgroundColor: colors.greenSoft, padding: 10, borderRadius: 8, marginTop: 8 }}>
                  <Text style={{ color: colors.green, fontWeight: '700' }}>{t("GoTrip support")}</Text>
                  <Text style={font.body}>{tk.adminReply}</Text>
                </View>
              )}
            </Card>
          ))
        ) : (
          <Text style={font.sub}>{t("No tickets yet.")}</Text>
        )}
      </Section>
      <Section title={t("Frequently asked questions")} icon="help-circle">
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
