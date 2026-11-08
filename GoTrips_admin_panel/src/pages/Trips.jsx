import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAction, useFilters, useGet, useList } from '../lib/hooks';
import { Badge, DataTable, Modal, Pagination, ReasonDialog, SearchBox, Spinner } from '../components/ui';
import { dateTime, label, rupees } from '../lib/format';
import { useAdmin, can } from '../App';

export default function Trips() {
  const [f, setF] = useFilters();
  const { data } = useList('trips', '/trips', f);
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trips</h1>
          <p>Start and return trips created by partners</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Place, driver or registration no." />
          <select className="input" value={f.status || ''} onChange={(e) => setF({ status: e.target.value })}>
            <option value="">Any status</option>
            {['scheduled', 'ongoing', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <select className="input" value={f.type || ''} onChange={(e) => setF({ type: e.target.value })}>
            <option value="">Start & return</option>
            <option value="start">Start trips</option>
            <option value="return">Return trips</option>
          </select>
          <input className="input" type="date" value={f.from || ''} onChange={(e) => setF({ from: e.target.value })} title="Departure from" />
          <input className="input" type="date" value={f.to || ''} onChange={(e) => setF({ to: e.target.value })} title="Departure to" />
        </div>
        <DataTable
          rows={data?.data}
          onRowClick={(r) => setOpen(r.id)}
          columns={[
            { title: 'Route', render: (t) => <span className="strong">{t.originName} → {t.destinationName}</span> },
            { title: 'Type', render: (t) => <Badge tone={t.tripType === 'return' ? 'blue' : ''}>{label(t.tripType)}</Badge> },
            { title: 'Departure', render: (t) => dateTime(t.departureAt) },
            { title: 'Driver', render: (t) => <Link to={`/partners/${t.partner.id}`} onClick={(e) => e.stopPropagation()}>{t.partner.user.fullName}</Link> },
            { title: 'Vehicle', render: (t) => <span className="mono">{t.vehicle.registrationNumber}</span> },
            { title: 'Seats', render: (t) => `${t.totalSeats - t.availableSeats}/${t.totalSeats}` },
            { title: 'Fare', render: (t) => rupees(t.pricePerSeat) },
            { title: 'Requests', render: (t) => t._count.bookings },
            { title: 'Status', render: (t) => <Badge status={t.status} /> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
      {open && <TripModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function TripModal({ id, onClose }) {
  const { admin } = useAdmin();
  const { data: t } = useGet(['trip', id], `/trips/${id}`);
  const [cancel, setCancel] = useState(false);
  const act = useAction((reason) => api(`/trips/${id}/cancel`, { method: 'POST', body: { reason } }), { success: 'Trip cancelled. Passengers notified.', invalidate: ['trip', 'trips'] });
  return (
    <Modal title="Trip details" onClose={onClose} wide footer={t && can(admin, 'manage') && ['scheduled', 'ongoing'].includes(t.status) ? <button className="btn btn-danger" onClick={() => setCancel(true)}>Cancel trip</button> : null}>
      {!t ? (
        <Spinner />
      ) : (
        <div className="grid grid-2">
          <div>
            <h3>Route</h3>
            <ul className="stops">
              {t.stops.map((s) => (
                <li key={s.seq}>
                  <span className="dot" style={{ background: s.seq === 0 || s.seq === t.stops.length - 1 ? 'var(--primary)' : 'var(--muted)' }} />
                  <div>
                    <div className="strong">{s.placeName}</div>
                    <div className="muted small">
                      {s.district || ''} {s.fareFromStart != null && s.seq > 0 ? `· ₹${s.fareFromStart} from start` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="kv" style={{ marginTop: 12 }}>
              <dt>Departure</dt>
              <dd>{dateTime(t.departureAt)}</dd>
              <dt>Vehicle</dt>
              <dd>
                {t.vehicle.make} {t.vehicle.model} · <span className="mono">{t.vehicle.registrationNumber}</span>
              </dd>
              <dt>Driver</dt>
              <dd>
                {t.partner.user.fullName} · <span className="mono">{t.partner.user.phone}</span>
              </dd>
              <dt>Notes</dt>
              <dd>{t.notes || '—'}</dd>
              {t.cancelReason && (
                <>
                  <dt>Cancelled</dt>
                  <dd>{t.cancelReason}</dd>
                </>
              )}
            </dl>
          </div>
          <div>
            <h3>Booking requests ({t.bookings.length})</h3>
            <DataTable
              rows={t.bookings}
              empty="No requests"
              columns={[
                { title: 'Passenger', render: (b) => (<div><div>{b.passengerName || '—'}</div><div className="mono small muted">{b.passengerPhone}</div></div>) },
                { title: 'Seats', key: 'seats' },
                { title: 'Segment', render: (b) => `${b.pickupName} → ${b.dropName}` },
                { title: 'Status', render: (b) => <Badge status={b.status} /> },
              ]}
            />
          </div>
        </div>
      )}
      {cancel && <ReasonDialog title="Cancel this trip?" description="All pending and confirmed passengers are notified." danger confirmLabel="Cancel trip" onConfirm={(r) => act.mutateAsync(r)} onClose={() => setCancel(false)} />}
    </Modal>
  );
}
