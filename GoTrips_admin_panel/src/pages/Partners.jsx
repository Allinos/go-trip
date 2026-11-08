import { useNavigate } from 'react-router-dom';
import { useFilters, useGet, useList } from '../lib/hooks';
import { Badge, DataTable, Pagination, SearchBox } from '../components/ui';
import { date } from '../lib/format';

export default function Partners() {
  const [f, setF] = useFilters();
  const { data } = useList('partners', '/partners', f);
  const { data: cats } = useGet('categories', '/categories');
  const nav = useNavigate();
  const title = f.category === 'driver' ? 'Drivers' : f.verificationStatus === 'pending' ? 'Partner verification queue' : 'Partners';
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{f.verificationStatus === 'pending' ? 'Registered partners waiting for document verification (oldest first)' : 'Drivers, taxi owners, rental providers and fleet owners'}</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Search name, business, phone or district" />
          <select className="input" value={f.category || ''} onChange={(e) => setF({ category: e.target.value })}>
            <option value="">All partner types</option>
            {cats?.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="input" value={f.accountStatus || ''} onChange={(e) => setF({ accountStatus: e.target.value })}>
            <option value="">Any registration</option>
            <option value="onboarding">Registration incomplete</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select className="input" value={f.verificationStatus || ''} onChange={(e) => setF({ verificationStatus: e.target.value })}>
            <option value="">Any verification</option>
            <option value="pending">Pending review</option>
            <option value="approved">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="unverified">Not submitted</option>
          </select>
        </div>
        <DataTable
          rows={data?.data}
          onRowClick={(r) => nav(`/partners/${r.id}`)}
          columns={[
            { title: 'Partner', render: (r) => (<div><div className="strong">{r.businessName || r.user.fullName || '—'}</div><div className="muted small mono">{r.user.phone}</div></div>) },
            { title: 'Type', render: (r) => r.category.name },
            { title: 'District', render: (r) => r.district || '—' },
            { title: 'Registration', render: (r) => <Badge status={r.accountStatus}>{r.accountStatus === 'onboarding' ? 'Incomplete' : undefined}</Badge> },
            { title: 'Verification', render: (r) => <Badge status={r.verificationStatus} /> },
            { title: 'Listed', render: (r) => (r.driverProfile ? <Badge tone={r.driverProfile.isListed ? 'green' : ''}>{r.driverProfile.isListed ? 'Live' : 'Hidden'}</Badge> : <span className="muted">—</span>) },
            { title: 'Vehicles', render: (r) => r._count.vehicles },
            { title: 'Submitted', render: (r) => date(r.submittedAt || r.createdAt) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}
