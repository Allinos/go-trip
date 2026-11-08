import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAction, useGet } from '../lib/hooks';
import { Card, Field, Spinner } from '../components/ui';
import { useAdmin, can } from '../App';

export default function Settings() {
  const { admin } = useAdmin();
  const { data, isLoading } = useGet('settings', '/settings');
  const [f, setF] = useState(null);
  useEffect(() => data && setF(data), [data]);
  const save = useAction((body) => api('/settings', { method: 'PATCH', body }), { success: 'Settings saved', invalidate: ['settings'] });
  if (isLoading || !f) return <Spinner />;
  const isSuper = can(admin, 'super');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Number(e.target.value) : e.target.value });
  const changed = Object.fromEntries(Object.entries(f).filter(([k, v]) => data[k] !== v));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Feature switches and app configuration. Changes apply within a minute.</p>
        </div>
        {isSuper && (
          <button className="btn btn-primary" disabled={!Object.keys(changed).length || save.isPending} onClick={() => save.mutate(changed)}>
            Save changes
          </button>
        )}
      </div>
      {!isSuper && <div className="alert">Only super admins can change settings.</div>}
      <fieldset disabled={!isSuper} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="grid grid-2">
          <Card title="Features">
            <label className="check">
              <input type="checkbox" checked={!!f.goods_orders_enabled} onChange={set('goods_orders_enabled')} />
              <span>
                <strong>Goods transport orders</strong>
                <br />
                <span className="muted small">Currently {data.goods_orders_enabled ? 'ON' : 'OFF'}. When on, customers can post goods orders and fleet partners can see them.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={!!f.driver_listing_requires_approval} onChange={set('driver_listing_requires_approval')} />
              <span>
                <strong>Drivers need admin approval before listing</strong>
                <br />
                <span className="muted small">Off: drivers appear on the marketplace right after paying; approval adds the Verified badge.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" checked={!!f.sms_booking_alerts} onChange={set('sms_booking_alerts')} />
              <span>
                <strong>SMS partners about new booking requests</strong>
                <br />
                <span className="muted small">In addition to push notifications (SMS costs apply).</span>
              </span>
            </label>
          </Card>
          <Card title="Bookings & location">
            <Field label="Auto-expire unanswered booking requests after (minutes)" hint="0 = expire only when the trip departs">
              <input className="input" type="number" min="0" value={f.booking_request_expiry_minutes} onChange={set('booking_request_expiry_minutes')} />
            </Field>
            <Field label="Maximum live location sharing (hours)">
              <input className="input" type="number" min="1" max="24" value={f.location_share_max_hours} onChange={set('location_share_max_hours')} />
            </Field>
          </Card>
          <Card title="Support contact (shown in apps)">
            <Field label="Support phone">
              <input className="input" value={f.support_phone} onChange={set('support_phone')} />
            </Field>
            <Field label="Support email">
              <input className="input" value={f.support_email} onChange={set('support_email')} />
            </Field>
          </Card>
          <Card title="Minimum app versions">
            <Field label="User app" hint="Older versions are asked to update">
              <input className="input" value={f.min_app_version_user} onChange={set('min_app_version_user')} />
            </Field>
            <Field label="Partner app">
              <input className="input" value={f.min_app_version_partner} onChange={set('min_app_version_partner')} />
            </Field>
          </Card>
        </div>
      </fieldset>
    </>
  );
}
