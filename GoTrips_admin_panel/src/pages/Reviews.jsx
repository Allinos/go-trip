import { Link } from 'react-router-dom';
import { useAdmin, can } from '../App';
import { api } from '../lib/api';
import { useAction, useFilters, useList } from '../lib/hooks';
import { Badge, DataTable, Pagination, SearchBox, Tabs } from '../components/ui';
import { dateTime } from '../lib/format';

const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

/** Passenger ratings of completed trips. Hide abusive or fake reviews; the partner's average updates at once. */
export default function Reviews() {
  const { admin } = useAdmin();
  const [f, setF] = useFilters();
  const { data } = useList('reviews', '/reviews', f);
  const toggle = useAction(({ id, hidden }) => api(`/reviews/${id}/visibility`, { method: 'POST', body: { hidden } }), { success: 'Saved', invalidate: ['reviews'] });
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Reviews</h1>
          <p>Ratings passengers gave after completed trips. Hidden reviews are not shown in the apps and do not count towards the rating.</p>
        </div>
      </div>
      <Tabs
        value={f.rating || (f.hidden === 'true' ? 'hidden' : '')}
        onChange={(v) => setF(v === 'hidden' ? { hidden: 'true', rating: '' } : { rating: v, hidden: '' })}
        tabs={[{ value: '', label: 'All' }, { value: '1', label: '1 ★' }, { value: '2', label: '2 ★' }, { value: '3', label: '3 ★' }, { value: '4', label: '4 ★' }, { value: '5', label: '5 ★' }, { value: 'hidden', label: 'Hidden' }]}
      />
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Comment, passenger or partner name" />
        </div>
        <DataTable
          rows={data?.data}
          columns={[
            { title: 'Rating', render: (r) => <span style={{ color: '#F59E0B', whiteSpace: 'nowrap' }}>{stars(r.rating)}</span> },
            { title: 'Comment', render: (r) => r.comment || <span className="muted">—</span> },
            { title: 'Partner', render: (r) => <Link to={`/partners/${r.partner.id}`}>{r.partner.businessName || r.partner.user.fullName}</Link> },
            { title: 'Passenger', render: (r) => (<div><div>{r.user.fullName || '—'}</div><div className="mono small muted">{r.user.phone}</div></div>) },
            { title: 'Booking', render: (r) => (<div><div className="mono small">{r.booking.code}</div><div className="muted small">{r.booking.pickupName} → {r.booking.dropName}</div></div>) },
            { title: 'Status', render: (r) => <Badge status={r.isHidden ? 'rejected' : 'approved'}>{r.isHidden ? 'Hidden' : 'Visible'}</Badge> },
            { title: 'Date', render: (r) => dateTime(r.createdAt) },
            {
              title: '',
              render: (r) =>
                can(admin, 'manage') && (
                  <button className="btn btn-sm" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: r.id, hidden: !r.isHidden })}>
                    {r.isHidden ? 'Show' : 'Hide'}
                  </button>
                ),
            },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}
