import { Link } from 'react-router-dom';
import { Users, UserCheck, Car, CalendarCheck, CreditCard, Route, IdCard, LifeBuoy } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { useGet } from '../lib/hooks';
import { Card, Spinner, StatCard } from '../components/ui';
import { inr, num } from '../lib/format';

function fill30(rows, key) {
  const map = Object.fromEntries((rows || []).map((r) => [r.day, r[key]]));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400_000);
    const day = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return { day: day.slice(5), value: map[day] || 0 };
  });
}

export default function Dashboard() {
  const { data, isLoading } = useGet('dashboard', '/dashboard', { refetchInterval: 60_000 });
  if (isLoading || !data) return <Spinner />;
  const b = data.bookings || {};
  const needsAttention = data.vehicles.pending + data.partners.pendingVerification;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of GoTrip activity</p>
        </div>
      </div>

      {needsAttention > 0 && (
        <div className="alert">
          <strong>{needsAttention} item(s) waiting for verification.</strong>{' '}
          {data.vehicles.pending > 0 && <Link to="/vehicles?status=pending">{data.vehicles.pending} vehicle(s)</Link>}
          {data.vehicles.pending > 0 && data.partners.pendingVerification > 0 && ' · '}
          {data.partners.pendingVerification > 0 && <Link to="/partners?verificationStatus=pending&accountStatus=active">{data.partners.pendingVerification} partner profile(s)</Link>}
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard icon={Users} label="Registered users" value={num(data.users.total)} sub={`+${num(data.users.newLast30Days)} in last 30 days`} to="/users" />
        <StatCard icon={Users} label="Customers" value={num(data.users.customers)} sub={`${num(data.users.blocked)} blocked`} to="/users?type=customer" />
        <StatCard icon={UserCheck} label="Partners" value={num(data.users.partners)} sub={`${num(data.partners.active)} active · ${num(data.partners.onboarding)} onboarding`} to="/partners" />
        <StatCard icon={IdCard} label="Drivers listed" value={num(data.partners.listedDrivers)} sub="Live on marketplace" to="/partners?category=driver" />
        <StatCard icon={Car} label="Approved vehicles" value={num(data.vehicles.approved)} sub={`${num(data.vehicles.pending)} pending · ${num(data.vehicles.rentalListed)} for rent`} to="/vehicles" />
        <StatCard icon={Route} label="Upcoming trips" value={num(data.trips.upcoming)} to="/trips?status=scheduled" />
        <StatCard icon={CalendarCheck} label="Bookings" value={num(Object.values(b).reduce((a, c) => a + c, 0))} sub={`${num(b.pending)} pending · ${num(b.accepted)} confirmed · ${num(b.completed)} completed`} to="/bookings" />
        <StatCard icon={CreditCard} label="Registration fees" value={inr(data.revenue.total)} sub={`${inr(data.revenue.thisMonth)} this month (${data.revenue.thisMonthCount})`} to="/payments?status=paid" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="New sign-ups (30 days)">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={fill30(data.series.signups, 'count')}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} interval={4} />
                <YAxis allowDecimals={false} fontSize={11} width={32} />
                <Tooltip />
                <Area dataKey="value" name="Sign-ups" stroke="#ef4444" fill="#fecaca" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Fee collections (30 days)">
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={fill30(data.series.revenue, 'amount').map((d) => ({ ...d, value: d.value / 100 }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" fontSize={11} interval={4} />
                <YAxis fontSize={11} width={48} />
                <Tooltip formatter={(v) => `₹${v}`} />
                <Bar dataKey="value" name="Collected" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-3">
        <Card title="Partners by type">
          <table>
            <tbody>
              {data.partners.byCategory.map((c) => (
                <tr key={c.code}>
                  <td>
                    <Link to={`/partners?category=${c.code}`}>{c.name}</Link>
                  </td>
                  <td style={{ textAlign: 'right' }} className="strong">
                    {num(c.count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Verification">
          <dl className="kv">
            <dt>Partners pending</dt>
            <dd>{num(data.partners.pendingVerification)}</dd>
            <dt>Partners verified</dt>
            <dd>{num(data.partners.verified)}</dd>
            <dt>Vehicles pending</dt>
            <dd>{num(data.vehicles.pending)}</dd>
            <dt>Vehicles rejected</dt>
            <dd>{num(data.vehicles.rejected)}</dd>
            <dt>Suspended partners</dt>
            <dd>{num(data.partners.suspended)}</dd>
          </dl>
        </Card>
        <Card title="Support">
          <StatCard icon={LifeBuoy} label="Open tickets" value={num(data.openTickets)} to="/support?status=open" />
        </Card>
      </div>
    </>
  );
}
