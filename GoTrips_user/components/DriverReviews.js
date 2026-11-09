import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, Input, Row } from './ui';
import { StarInput, Stars } from './Stars';
import { marketplaceAPI, errorMessage } from '../services/api';
import { COLORS, SPACING, TYPOGRAPHY } from '../constants';
import { ago } from '../utils/format';
import { t } from '../i18n';

/**
 * Ratings on a marketplace driver profile. Hiring happens off the app, so a customer can rate a driver
 * once they have called or messaged them through GoTrip (one rating per customer, editable).
 */
export default function DriverReviews({ driver: d, loggedIn, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await marketplaceAPI.review(d.id, { rating: stars, comment: comment.trim() || undefined });
      setEditing(false);
      onSaved?.();
    } catch (e) {
      Alert.alert(t("Error"), errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const edit = () => {
    setStars(d.myReview?.rating || 0);
    setComment(d.myReview?.comment || '');
    setEditing(true);
  };

  return (
    <>
      <Card style={{ marginBottom: SPACING.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={TYPOGRAPHY.bodyBold}>{t("Ratings")}</Text>
          {d.rating ? <Stars value={d.rating.average} count={d.rating.count} /> : <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>{t("No ratings yet")}</Text>}
        </Row>
        {d.reviews?.map((r) => (
          <View key={r.id} style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.divider }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Stars value={r.rating} size={12} />
              <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary }]}>
                {r.by || t("Customer")} · {ago(r.createdAt)}
              </Text>
            </Row>
            {r.comment ? <Text style={[TYPOGRAPHY.caption, { marginTop: 4 }]}>{r.comment}</Text> : null}
          </View>
        ))}
      </Card>

      {loggedIn &&
        (d.myReview && !editing ? (
          <Card style={{ marginBottom: SPACING.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={TYPOGRAPHY.bodyBold}>{t("Your rating")}</Text>
              <Button small variant="ghost" icon="edit" title={t("Edit")} onPress={edit} />
            </Row>
            <Stars value={d.myReview.rating} size={20} />
            {d.myReview.comment ? <Text style={[TYPOGRAPHY.caption, { marginTop: 6, color: COLORS.text.secondary }]}>“{d.myReview.comment}”</Text> : null}
          </Card>
        ) : d.canReview ? (
          <Card style={{ marginBottom: SPACING.md, borderColor: '#FDE68A' }}>
            <Text style={[TYPOGRAPHY.bodyBold, { textAlign: 'center', marginBottom: 8 }]}>{t("Did you hire {0}? Rate them", [d.name])}</Text>
            <StarInput value={stars} onChange={setStars} />
            {stars > 0 && (
              <>
                <Input style={{ marginTop: 12 }} value={comment} onChangeText={setComment} placeholder={t("How was the driver? (optional)")} maxLength={500} multiline />
                <Button title={t("Submit rating")} loading={saving} onPress={save} />
              </>
            )}
          </Card>
        ) : (
          <Text style={[TYPOGRAPHY.small, { color: COLORS.text.tertiary, textAlign: 'center', marginBottom: SPACING.md }]}>{t("You can rate this driver after you call or message them through GoTrip.")}</Text>
        ))}
    </>
  );
}
