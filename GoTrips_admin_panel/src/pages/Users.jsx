import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAction, useFilters, useGet, useList } from '../lib/hooks';
import { Badge, Card, DataTable, Pagination, ReasonDialog, SearchBox, Spinner } from '../components/ui';
import { date, dateTime, label, rupees } from '../lib/format';
import { useAdmin, can } from '../App';

export default function Users() {
  const [f, setF] = useFilters();
  const { data } = useList('users', '/users', f);
  const nav = useNavigate();
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users</h1>
          <p>Everyone who signed up in the user or partner app</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Search name, phone or email" />
          <select className="input" value={f.type || ''} onChange={(e) => setF({ type: e.target.value })}>
            <option value="">All users</option>
            <option value="customer">Customers only</option>
            <option value="partner">Partners only</option>
          </select>
          <select className="input" value={f.status || ''} onChange={(e) => setF({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <DataTable
          rows={data?.data}
          onRowClick={(r) => nav(`/users/${r.id}`)}
          columns={[
            { title: 'Name', render: (r) => <span className="strong">{r.fullName || <span className="muted">Not set</span>}</span> },
            { title: 'Phone', render: (r) => <span className="mono">{r.phone}</span> },
            { title: 'Type', render: (r) => (r.partner ? <Badge tone="blue">{r.partner.category.name}</Badge> : <Badge tone="">Customer</Badge>) },
            { title: 'Bookings', render: (r) => r._count.bookings },
            { title: 'Status', render: (r) => <Badge status={r.status} /> },
            { title: 'Joined', render: (r) => date(r.createdAt) },
            { title: 'Last login', render: (r) => <span className="muted">{dateTime(r.lastLoginAt)}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}

export function UserDetail() {
  const { id } = useParams();
  const { admin } = useAdmin();
  const { data: u, isLoading } = useGet(['user', id], `/users/${id}`);
  const [dialog, setDialog] = useState(null);
  const block = useAction((reason) => api(`/users/${id}/block`, { method: 'POST', body: { reason } }), { success: 'User blocked', invalidate: ['user', 'users'] });
  const unblock = useAction(() => api(`/users/${id}/unblock`, { method: 'POST' }), { success: 'User unblocked', invalidate: ['user', 'users'] });
  if (isLoading || !u) return <Spinner />;
  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/users" className="small">
            ← Users
          </Link>
          <h1>{u.fullName || u.phone}</h1>
          <p>
            <Badge status={u.status} /> {u.partner && <Link to={`/partners/${u.partner.id}`}>View partner profile →</Link>}
          </p>
        </div>
        {can(admin, 'manage') && (
          <div className="row">
            {u.status === 'active' ? (
              <button className="btn btn-danger" onClick={() => setDialog('block')}>
                Block user
              </button>
            ) : (
              <button className="btn" onClick={() => unblock.mutate()}>
                Unblock
              </button>
            )}
          </div>
        )}
      </div>
      {u.status === 'blocked' && <div className="alert red">Blocked: {u.blockReason}</div>}
      <div className="grid grid-2">
        <Card title="Profile">
          <dl className="kv">
            <dt>Phone</dt>
            <dd className="mono">{u.phone}</dd>
            <dt>Email</dt>
            <dd>{u.email || '—'}</dd>
            <dt>Gender</dt>
            <dd>{label(u.gender)}</dd>
            <dt>City</dt>
            <dd>{u.city || '—'}</dd>
            <dt>Joined</dt>
            <dd>{dateTime(u.createdAt)}</dd>
            <dt>Last login</dt>
            <dd>{dateTime(u.lastLoginAt)}</dd>
            <dt>Active sessions</dt>
            <dd>{u._count.sessions}</dd>
          </dl>
        </Card>
        <Card title={`Support tickets (${u.tickets.length})`} pad={false}>
          <DataTable rows={u.tickets} empty="No tickets" columns={[{ title: 'Subject', key: 'subject' }, { title: 'Status', render: (t) => <Badge status={t.status} /> }, { title: 'Date', render: (t) => date(t.createdAt) }]} />
        </Card>
      </div>
      <div style={{ height: 16 }} />
      <Card title={`Bookings (${u._count.bookings})`} pad={false}>
        <DataTable
          rows={u.bookings}
          empty="No bookings yet"
          columns={[
            { title: 'Code', render: (b) => <span className="mono">{b.code}</span> },
            { title: 'Route', render: (b) => `${b.pickupName} → ${b.dropName}` },
            { title: 'Departure', render: (b) => dateTime(b.trip.departureAt) },
            { title: 'Seats', key: 'seats' },
            { title: 'Fare (est.)', render: (b) => rupees(b.fareEstimate) },
            { title: 'Status', render: (b) => <Badge status={b.status} /> },
          ]}
        />
      </Card>
      {dialog === 'block' && <ReasonDialog title="Block this user?" description="They will be logged out and cannot use either app." danger confirmLabel="Block" onConfirm={(r) => block.mutateAsync(r)} onClose={() => setDialog(null)} />}
    </>
  );
}
