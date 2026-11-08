import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAction, useGet } from '../lib/hooks';
import { Badge, Card, DataTable, Field, Modal, ReasonDialog, Spinner, Tabs, useToast } from '../components/ui';
import DocReview from '../components/DocReview';
import { date, dateTime, inr, label, rupees } from '../lib/format';
import { useAdmin, can } from '../App';

export default function PartnerDetail() {
  const { id } = useParams();
  const { admin } = useAdmin();
  const toast = useToast();
  const { data: p, isLoading } = useGet(['partner', id], `/partners/${id}`);
  const [tab, setTab] = useState('overview');
  const [decisions, setDecisions] = useState({});
  const [dialog, setDialog] = useState(null);
  const inv = ['partner', 'partners', 'dashboard'];
  const verify = useAction((body) => api(`/partners/${id}/verify`, { method: 'POST', body }), { success: 'Verification saved. Partner notified.', invalidate: inv });
  const suspend = useAction((reason) => api(`/partners/${id}/suspend`, { method: 'POST', body: { reason } }), { success: 'Partner suspended', invalidate: inv });
  const reactivate = useAction(() => api(`/partners/${id}/reactivate`, { method: 'POST' }), { success: 'Partner reactivated', invalidate: inv });
  const listing = useAction((body) => api(`/partners/${id}/listing`, { method: 'PATCH', body }), { success: 'Listing updated', invalidate: inv });

  if (isLoading || !p) return <Spinner />;
  const canManage = can(admin, 'manage');
  const partnerReqs = p.category.requirements.filter((r) => r.scope === 'partner');
  const docDecisions = Object.entries(decisions).map(([docId, d]) => ({ id: Number(docId), status: d.status, reason: d.reason || undefined }));
  const anyRejected = docDecisions.some((d) => d.status === 'rejected');

  const submit = async () => {
    if (anyRejected && docDecisions.some((d) => d.status === 'rejected' && !d.reason?.trim())) return toast('Add a reason for each rejected document', 'error');
    if (anyRejected) {
      const reason = docDecisions.filter((d) => d.status === 'rejected').map((d) => `${label(p.documents.find((x) => x.id === d.id)?.docType)}: ${d.reason}`).join('; ');
      await verify.mutateAsync({ decision: 'reject', reason, documents: docDecisions });
    } else {
      await verify.mutateAsync({ decision: 'approve', documents: docDecisions });
    }
    setDecisions({});
  };

  const dp = p.driverProfile;
  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/partners" className="small">
            ← Partners
          </Link>
          <h1>{p.businessName || p.user.fullName || p.user.phone}</h1>
          <p className="row">
            <Badge tone="blue">{p.category.name}</Badge>
            <Badge status={p.accountStatus}>{p.accountStatus === 'onboarding' ? 'Registration incomplete' : undefined}</Badge>
            <Badge status={p.verificationStatus}>{p.verificationStatus === 'approved' ? 'Verified' : undefined}</Badge>
            {dp && <Badge tone={dp.isListed ? 'green' : ''}>{dp.isListed ? 'Listed on marketplace' : 'Not listed'}</Badge>}
          </p>
        </div>
        {canManage && (
          <div className="row">
            {p.accountStatus === 'suspended' ? (
              <button className="btn" onClick={() => reactivate.mutate()}>
                Reactivate
              </button>
            ) : (
              <button className="btn btn-danger" onClick={() => setDialog('suspend')}>
                Suspend partner
              </button>
            )}
            {can(admin, 'super') && p.category.registrationFee > 0 && (
              <button className="btn" onClick={() => setDialog('listing')}>
                Listing validity
              </button>
            )}
          </div>
        )}
      </div>
      {p.accountStatus === 'suspended' && <div className="alert red">Suspended: {p.suspendedReason}</div>}
      {p.verificationStatus === 'rejected' && <div className="alert red">Last rejection: {p.rejectionReason}</div>}
      {p.accountStatus === 'onboarding' && (
        <div className="alert">
          Registration incomplete. Next step: <strong>{label(p.onboarding.nextStep)}</strong>
        </div>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'documents', label: `Documents (${p.documents.length})` },
          ...(dp ? [{ value: 'driver', label: 'Driver profile' }] : []),
          ...(p.category.canListVehicles ? [{ value: 'vehicles', label: `Vehicles (${p.vehicles.length})` }] : []),
          { value: 'payments', label: `Payments (${p.payments.length})` },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid grid-2">
          <Card title="Contact & business">
            <dl className="kv">
              <dt>Name</dt>
              <dd>
                <Link to={`/users/${p.user.id}`}>{p.user.fullName || '—'}</Link>
              </dd>
              <dt>Phone</dt>
              <dd className="mono">{p.user.phone}</dd>
              <dt>WhatsApp</dt>
              <dd className="mono">{p.whatsappPhone || '—'}</dd>
              <dt>Alternate phone</dt>
              <dd className="mono">{p.alternatePhone || '—'}</dd>
              <dt>Email</dt>
              <dd>{p.user.email || '—'}</dd>
              <dt>Business name</dt>
              <dd>{p.businessName || '—'}</dd>
              <dt>Address</dt>
              <dd>{[p.address, p.city, p.district, p.pincode].filter(Boolean).join(', ') || '—'}</dd>
            </dl>
          </Card>
          <Card title="Status & activity">
            <dl className="kv">
              <dt>Registered</dt>
              <dd>{dateTime(p.createdAt)}</dd>
              <dt>Completed registration</dt>
              <dd>{dateTime(p.activatedAt)}</dd>
              <dt>Verified on</dt>
              <dd>{dateTime(p.verifiedAt)}</dd>
              <dt>Fee paid</dt>
              <dd>{p.category.registrationFee ? dateTime(p.feePaidAt) : 'No fee for this type'}</dd>
              <dt>Listing valid until</dt>
              <dd>{p.listingExpiresAt ? date(p.listingExpiresAt) : '—'}</dd>
              <dt>Bookings</dt>
              <dd>{Object.entries(p.stats.bookings).map(([k, v]) => `${label(k)}: ${v}`).join(' · ') || '—'}</dd>
              <dt>Trips</dt>
              <dd>{Object.entries(p.stats.trips).map(([k, v]) => `${label(k)}: ${v}`).join(' · ') || '—'}</dd>
              <dt>Calls received</dt>
              <dd>{p.stats.calls}</dd>
              <dt>Location sharing</dt>
              <dd>{p.locationShare?.isSharing ? `On (updated ${dateTime(p.locationShare.updatedAt)})` : 'Off'}</dd>
            </dl>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <Card
          title="Identity & licence documents"
          actions={
            canManage &&
            p.documents.length > 0 && (
              <button className={`btn ${anyRejected ? 'btn-primary' : 'btn-success'}`} disabled={verify.isPending} onClick={submit}>
                {anyRejected ? 'Reject & notify partner' : 'Approve partner'}
              </button>
            )
          }
        >
          {canManage && <p className="muted small" style={{ marginTop: 0 }}>Mark each document. Unmarked documents are approved when you approve the partner.</p>}
          <DocReview documents={p.documents} requirements={partnerReqs} decisions={decisions} setDecisions={setDecisions} editable={canManage} />
        </Card>
      )}

      {tab === 'driver' && dp && (
        <div className="grid grid-2">
          <Card title="Marketplace profile">
            <dl className="kv">
              <dt>Headline</dt>
              <dd>{dp.headline || '—'}</dd>
              <dt>About</dt>
              <dd>{dp.bio || '—'}</dd>
              <dt>Experience</dt>
              <dd>{dp.hasPriorExperience ? `${dp.experienceYears} year(s)` : 'No prior experience'}</dd>
              <dt>Experience details</dt>
              <dd>{dp.experienceDetails || '—'}</dd>
              <dt>Vehicles</dt>
              <dd>{dp.vehicleTypes.map(label).join(', ') || '—'}</dd>
              <dt>Work types</dt>
              <dd>{dp.workTypes.map(label).join(', ') || '—'}</dd>
              <dt>Languages</dt>
              <dd>{dp.languages.join(', ') || '—'}</dd>
              <dt>Service areas</dt>
              <dd>{dp.serviceAreas.join(', ') || '—'}</dd>
              <dt>Availability</dt>
              <dd>{label(dp.availability)} {dp.isAvailable ? '' : '(paused)'}</dd>
              <dt>Expected pay</dt>
              <dd>{dp.expectedPayMin != null ? `${rupees(dp.expectedPayMin)} – ${rupees(dp.expectedPayMax)} ${label(dp.payUnit)}` : '—'}</dd>
            </dl>
          </Card>
          <Card title="Licence & stats">
            <dl className="kv">
              <dt>Licence no.</dt>
              <dd className="mono">{dp.licenseNumber || '—'}</dd>
              <dt>Licence types</dt>
              <dd>{dp.licenseTypes.join(', ') || '—'}</dd>
              <dt>Licence expiry</dt>
              <dd>{date(dp.licenseExpiry)}</dd>
              <dt>Profile completeness</dt>
              <dd>{dp.completeness}%</dd>
              <dt>Profile views</dt>
              <dd>{dp.viewCount}</dd>
              <dt>Call taps</dt>
              <dd>{dp.callCount}</dd>
              <dt>Listed since</dt>
              <dd>{dateTime(dp.listedAt)}</dd>
            </dl>
          </Card>
        </div>
      )}

      {tab === 'vehicles' && (
        <Card pad={false}>
          <DataTable
            rows={p.vehicles}
            empty="No vehicles listed"
            columns={[
              { title: 'Vehicle', render: (v) => <Link to={`/vehicles/${v.id}`}>{`${v.make} ${v.model}`}</Link> },
              { title: 'Reg. no', render: (v) => <span className="mono">{v.registrationNumber}</span> },
              { title: 'Use', render: (v) => [v.forTrips && 'Trips', v.forRental && 'Rental', v.forGoods && 'Goods'].filter(Boolean).join(', ') },
              { title: 'Status', render: (v) => <Badge status={v.verificationStatus} /> },
              { title: 'Availability', render: (v) => <Badge tone={v.isAvailable ? 'green' : ''}>{v.isAvailable ? 'ON' : 'OFF'}</Badge> },
            ]}
          />
        </Card>
      )}

      {tab === 'payments' && (
        <Card pad={false}>
          <DataTable
            rows={p.payments}
            empty="No payments"
            columns={[
              { title: 'Receipt', render: (x) => <span className="mono">{x.receipt}</span> },
              { title: 'Amount', render: (x) => inr(x.amount) },
              { title: 'Status', render: (x) => <Badge status={x.status} /> },
              { title: 'Method', render: (x) => label(x.method) },
              { title: 'Paid', render: (x) => dateTime(x.paidAt) },
              { title: 'Valid until', render: (x) => date(x.validUntil) },
            ]}
          />
        </Card>
      )}

      {dialog === 'suspend' && <ReasonDialog title="Suspend partner?" description="Their listings, vehicles and trips are hidden and they cannot use the partner app." danger confirmLabel="Suspend" onConfirm={(r) => suspend.mutateAsync(r)} onClose={() => setDialog(null)} />}
      {dialog === 'listing' && <ListingDialog partner={p} onSave={(b) => listing.mutateAsync(b)} onClose={() => setDialog(null)} />}
    </>
  );
}

function ListingDialog({ partner, onSave, onClose }) {
  const [expires, setExpires] = useState(partner.listingExpiresAt ? partner.listingExpiresAt.slice(0, 10) : '');
  const [markPaid, setMarkPaid] = useState(!partner.feePaidAt);
  const [note, setNote] = useState('');
  return (
    <Modal
      title="Listing validity override"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={note.trim().length < 3} onClick={async () => (await onSave({ listingExpiresAt: expires ? new Date(expires).toISOString() : null, markFeePaid: markPaid, note }), onClose())}>
            Save
          </button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>Use this for offline payments or goodwill extensions. This action is recorded in the audit log.</p>
      <Field label="Listing valid until" hint="Leave empty for no expiry">
        <input className="input" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </Field>
      <label className="check">
        <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} /> Mark registration fee as paid
      </label>
      <Field label="Note (required)">
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid in cash at office, receipt #123" />
      </Field>
    </Modal>
  );
}
