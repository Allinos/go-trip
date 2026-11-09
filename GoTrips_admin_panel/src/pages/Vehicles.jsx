import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAction, useFilters, useGet, useList } from '../lib/hooks';
import { Badge, Card, DataTable, Pagination, ReasonDialog, SearchBox, Spinner, Tabs, useToast } from '../components/ui';
import DocReview from '../components/DocReview';
import { date, dateTime, label, rupees } from '../lib/format';
import { useAdmin, can } from '../App';

const usage = (v) => [v.forTrips && 'Trips', v.forRental && 'Rental', v.forGoods && 'Goods'].filter(Boolean).join(', ') || '—';

export default function Vehicles() {
  const [f, setF] = useFilters();
  const { data } = useList('vehicles', '/vehicles', f);
  const nav = useNavigate();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{f.status === 'pending' ? 'Vehicle verification requests' : 'Vehicles'}</h1>
          <p>Only approved vehicles are visible to customers</p>
        </div>
      </div>
      <Tabs
        value={f.status || ''}
        onChange={(status) => setF({ status })}
        tabs={[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending review' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'suspended', label: 'Suspended / removed' },
        ]}
      />
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Registration no., make, model or owner" />
          <select className="input" value={f.usage || ''} onChange={(e) => setF({ usage: e.target.value })}>
            <option value="">Any use</option>
            <option value="trips">Trips</option>
            <option value="rental">Rental</option>
            <option value="goods">Goods</option>
          </select>
        </div>
        <DataTable
          rows={data?.data}
          onRowClick={(r) => nav(`/vehicles/${r.id}`)}
          columns={[
            { title: 'Vehicle', render: (v) => (<div className="row">{v.photos[0] ? <img src={v.photos[0]} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} /> : null}<div><div className="strong">{v.make} {v.model}</div><div className="muted small">{label(v.vehicleClass)}{v.year ? ` · ${v.year}` : ''}</div></div></div>) },
            { title: 'Reg. no', render: (v) => <span className="mono">{v.registrationNumber}</span> },
            { title: 'Owner', render: (v) => (<div><div>{v.partner.businessName || v.partner.user.fullName}</div><div className="muted small">{v.partner.category.name}</div></div>) },
            { title: 'Use', render: usage },
            { title: 'Docs', render: (v) => v.documentCount },
            { title: 'Status', render: (v) => <Badge status={v.verificationStatus} /> },
            { title: 'Submitted', render: (v) => date(v.submittedAt) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}

export function VehicleDetail() {
  const { id } = useParams();
  const { admin } = useAdmin();
  const toast = useToast();
  const { data: v, isLoading } = useGet(['vehicle', id], `/vehicles/${id}`);
  const [decisions, setDecisions] = useState({});
  const [dialog, setDialog] = useState(null);
  const inv = ['vehicle', 'vehicles', 'dashboard'];
  const review = useAction((body) => api(`/vehicles/${id}/review`, { method: 'POST', body }), { success: 'Saved. The partner has been notified.', invalidate: inv });
  const suspend = useAction((reason) => api(`/vehicles/${id}/suspend`, { method: 'POST', body: { reason } }), { success: 'Vehicle suspended', invalidate: inv });
  if (isLoading || !v) return <Spinner />;
  const canManage = can(admin, 'manage');
  const docs = Object.entries(decisions).map(([docId, d]) => ({ id: Number(docId), status: d.status, reason: d.reason || undefined }));
  const missing = v.missingDocuments || [];
  const approve = () => {
    if (missing.length && !window.confirm(`Required documents are missing: ${missing.join(', ')}.\n\nApprove anyway? Only do this if you checked them another way.`)) return;
    review.mutate({ decision: 'approve', documents: docs, ignoreMissingDocuments: missing.length > 0 });
  };
  const reject = async (reason) => {
    if (docs.some((d) => d.status === 'rejected' && !d.reason?.trim())) {
      toast('Add a reason for each rejected document', 'error');
      throw new Error('Add a reason for each rejected document');
    }
    await review.mutateAsync({ decision: 'reject', reason, documents: docs });
  };
  const r = v.rental;
  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/vehicles" className="small">
            ← Vehicles
          </Link>
          <h1>
            {v.make} {v.model} <span className="mono muted">{v.registrationNumber}</span>
          </h1>
          <p className="row">
            <Badge status={v.verificationStatus} />
            <Badge tone={v.isAvailable ? 'green' : ''}>{v.isAvailable ? 'Partner: ON' : 'Partner: OFF'}</Badge>
            <span className="muted">Owner:</span> <Link to={`/partners/${v.partner.id}`}>{v.partner.businessName || v.partner.user.fullName}</Link> <span className="muted">({v.partner.category})</span>
          </p>
        </div>
        {canManage && (
          <div className="row">
            {v.verificationStatus !== 'approved' && (
              <button className="btn btn-success" disabled={review.isPending || docs.some((d) => d.status === 'rejected')} onClick={approve}>
                Approve vehicle
              </button>
            )}
            {v.verificationStatus !== 'rejected' && (
              <button className="btn btn-danger" onClick={() => setDialog('reject')}>
                Reject
              </button>
            )}
            {v.verificationStatus === 'approved' && (
              <button className="btn btn-danger" onClick={() => setDialog('suspend')}>
                Suspend
              </button>
            )}
          </div>
        )}
      </div>
      {missing.length > 0 && v.verificationStatus !== 'approved' && <div className="alert amber">Required documents missing: {missing.join(', ')}</div>}
      {v.rejectionReason && v.verificationStatus !== 'approved' && <div className="alert red">{label(v.verificationStatus)}: {v.rejectionReason}</div>}
      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Vehicle details">
          <dl className="kv">
            <dt>Category</dt>
            <dd>{v.category === 'commercial' ? 'Goods vehicle' : 'Passenger vehicle'}</dd>
            <dt>Type</dt>
            <dd>{label(v.vehicleClass)}</dd>
            <dt>Year / colour</dt>
            <dd>{[v.year, v.color].filter(Boolean).join(' · ') || '—'}</dd>
            {v.category === 'commercial' ? (
              <>
                <dt>Load capacity</dt>
                <dd>{v.loadCapacityKg ? `${v.loadCapacityKg.toLocaleString('en-IN')} kg` : '—'}</dd>
                <dt>Body / length</dt>
                <dd>{[v.bodyType && label(v.bodyType), v.cargoLengthFt && `${v.cargoLengthFt} ft`].filter(Boolean).join(' · ') || '—'}</dd>
                <dt>Fuel</dt>
                <dd>{label(v.fuelType)}</dd>
              </>
            ) : (
              <>
                <dt>Seats</dt>
                <dd>{v.seats ?? '—'}</dd>
                <dt>Fuel / AC</dt>
                <dd>
                  {label(v.fuelType)} · {v.hasAc ? 'AC' : 'Non-AC'}
                </dd>
              </>
            )}
            <dt>Used for</dt>
            <dd>{usage(v)}</dd>
            <dt>Features</dt>
            <dd>{v.features?.join(', ') || '—'}</dd>
            <dt>Description</dt>
            <dd>{v.description || '—'}</dd>
            <dt>Submitted</dt>
            <dd>{dateTime(v.submittedAt)}</dd>
            <dt>Trips created</dt>
            <dd>{v.tripCount}</dd>
          </dl>
        </Card>
        <Card title="Photos & rental">
          {v.photos.length ? (
            <div className="photos">
              {v.photos.map((p) => (
                <a key={p} href={p} target="_blank" rel="noreferrer">
                  <img src={p} alt="" />
                </a>
              ))}
            </div>
          ) : (
            <div className="muted">No photos uploaded</div>
          )}
          {r && (
            <dl className="kv" style={{ marginTop: 16 }}>
              <dt>Rent</dt>
              <dd>
                {r.pricePerDay ? `${rupees(r.pricePerDay)}/day` : ''} {r.pricePerHour ? `${rupees(r.pricePerHour)}/hour` : ''}
              </dd>
              <dt>Driver</dt>
              <dd>{label(r.driverOption)}</dd>
              <dt>Deposit</dt>
              <dd>{rupees(r.securityDeposit)}</dd>
              <dt>Location</dt>
              <dd>
                {[r.address, r.city, r.district].filter(Boolean).join(', ')} {r.mapsUrl && <a href={r.mapsUrl} target="_blank" rel="noreferrer">Map</a>}
              </dd>
              <dt>Rental status</dt>
              <dd>{r.available ? 'Available' : 'Not available'}</dd>
            </dl>
          )}
        </Card>
      </div>
      <Card title="Vehicle documents">
        <DocReview documents={v.documents} requirements={v.requirements} decisions={decisions} setDecisions={setDecisions} editable={canManage && v.verificationStatus !== 'approved'} />
      </Card>
      {dialog === 'reject' && <ReasonDialog title="Reject vehicle?" description="The partner will see this reason and can fix and resubmit." danger confirmLabel="Reject" onConfirm={reject} onClose={() => setDialog(null)} />}
      {dialog === 'suspend' && <ReasonDialog title="Suspend vehicle?" description="It will be hidden from customers and new trips are blocked." danger confirmLabel="Suspend" onConfirm={(x) => suspend.mutateAsync(x)} onClose={() => setDialog(null)} />}
    </>
  );
}
