import { Link } from 'react-router-dom';
import { useFilters, useList } from '../lib/hooks';
import { Badge, DataTable, Pagination, SearchBox, Tabs } from '../components/ui';
import { dateTime, rupees } from '../lib/format';

export default function Bookings() {
  const [f, setF] = useFilters();
  const { data } = useList('bookings', '/bookings', f);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings</h1>
          <p>Seat booking requests sent by users to partners. Fares are estimates, paid directly to the driver.</p>
        </div>
      </div>
      <Tabs
        value={f.status || ''}
        onChange={(status) => setF({ status })}
        tabs={[{ value: '', label: 'All' }, ...['pending', 'accepted', 'completed', 'rejected', 'cancelled', 'expired'].map((s) => ({ value: s, label: s === 'accepted' ? 'Confirmed' : s[0].toUpperCase() + s.slice(1) }))]}
      />
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Booking code, passenger, phone or place" />
          <input className="input" type="date" value={f.from || ''} onChange={(e) => setF({ from: e.target.value })} />
          <input className="input" type="date" value={f.to || ''} onChange={(e) => setF({ to: e.target.value })} />
        </div>
        <DataTable
          rows={data?.data}
          columns={[
            { title: 'Code', render: (b) => <span className="mono strong">{b.code}</span> },
            { title: 'Passenger', render: (b) => (<div><div>{b.passengerName || '—'}</div><div className="mono small muted">{b.passengerPhone}</div></div>) },
            { title: 'Segment', render: (b) => `${b.pickupName} → ${b.dropName}` },
            { title: 'Trip', render: (b) => (<div><div className="small">{b.trip.originName} → {b.trip.destinationName}</div><div className="muted small">{dateTime(b.trip.departureAt)}</div></div>) },
            { title: 'Driver', render: (b) => <Link to={`/partners/${b.partner.id}`}>{b.partner.user.fullName}</Link> },
            { title: 'Seats', key: 'seats' },
            { title: 'Fare (est.)', render: (b) => rupees(b.fareEstimate) },
            { title: 'Status', render: (b) => <Badge status={b.status}>{b.status === 'accepted' ? 'Confirmed' : undefined}</Badge> },
            { title: 'Requested', render: (b) => dateTime(b.createdAt) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}
