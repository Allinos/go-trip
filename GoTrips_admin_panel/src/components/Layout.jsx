import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, Car, Route, CalendarCheck, CreditCard, LifeBuoy, Settings, Layers, MapPin, HelpCircle, Shield, ScrollText, Menu, LogOut, Truck, IdCard, Star } from 'lucide-react';
import { useAdmin, can } from '../App';
import { useGet } from '../lib/hooks';
import { label } from '../lib/format';

export default function Layout({ children }) {
  const { admin, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const { data: dash } = useGet('dashboard', '/dashboard', { refetchInterval: 60_000 });
  const pendingVehicles = dash?.vehicles?.pending || 0;
  const pendingPartners = dash?.partners?.pendingVerification || 0;

  // Several nav items share a path and differ only by query (e.g. /partners vs /partners?category=driver),
  // so "active" compares the query too.
  const QUERY_ITEMS = ['/partners?verificationStatus=pending&accountStatus=active', '/vehicles?status=pending', '/partners?category=driver'];
  const isActive = (to) => {
    const [path, query] = to.split('?');
    if (path === '/' ? loc.pathname !== '/' : !loc.pathname.startsWith(path)) return false;
    const current = new URLSearchParams(loc.search);
    if (query) return [...new URLSearchParams(query)].every(([k, v]) => current.get(k) === v);
    return !QUERY_ITEMS.some((q) => q.startsWith(path + '?') && [...new URLSearchParams(q.split('?')[1])].every(([k, v]) => current.get(k) === v));
  };

  const Item = ({ to, icon: Icon, children: c, count }) => (
    <Link to={to} className={isActive(to) ? 'active' : ''} onClick={() => setOpen(false)}>
      <Icon size={17} />
      {c}
      {count > 0 && <span className="count">{count}</span>}
    </Link>
  );

  return (
    <div className="layout">
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-badge">
            <Car size={18} />
          </div>
          GoTrip Admin
        </div>
        <nav className="nav">
          <Item to="/" icon={LayoutDashboard}>
            Dashboard
          </Item>
          <div className="nav-section">Verification</div>
          <Item to="/partners?verificationStatus=pending&accountStatus=active" icon={UserCheck} count={pendingPartners}>
            Partner documents
          </Item>
          <Item to="/vehicles?status=pending" icon={Car} count={pendingVehicles}>
            Vehicle requests
          </Item>
          <div className="nav-section">People</div>
          <Item to="/users" icon={Users}>
            Users
          </Item>
          <Item to="/partners" icon={UserCheck}>
            Partners
          </Item>
          <Item to="/partners?category=driver" icon={IdCard}>
            Drivers
          </Item>
          <div className="nav-section">Operations</div>
          <Item to="/vehicles" icon={Car}>
            Vehicles
          </Item>
          <Item to="/trips" icon={Route}>
            Trips
          </Item>
          <Item to="/bookings" icon={CalendarCheck}>
            Bookings
          </Item>
          <Item to="/reviews" icon={Star}>
            Reviews
          </Item>
          <Item to="/payments" icon={CreditCard}>
            Payments
          </Item>
          <Item to="/support" icon={LifeBuoy} count={dash?.openTickets}>
            Support tickets
          </Item>
          <Item to="/goods-orders" icon={Truck}>
            Goods orders
          </Item>
          <div className="nav-section">Configuration</div>
          <Item to="/categories" icon={Layers}>
            Partner types & fees
          </Item>
          <Item to="/locations" icon={MapPin}>
            Locations
          </Item>
          <Item to="/faqs" icon={HelpCircle}>
            FAQs
          </Item>
          <Item to="/settings" icon={Settings}>
            Settings
          </Item>
          {can(admin, 'super') && (
            <>
              <Item to="/admins" icon={Shield}>
                Admin users
              </Item>
              <Item to="/audit" icon={ScrollText}>
                Audit log
              </Item>
            </>
          )}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn btn-ghost menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            <Menu size={18} />
          </button>
          <span className="muted small">{loc.pathname === '/' ? 'Overview' : label(loc.pathname.split('/')[1])}</span>
          <div className="row">
            <span className="small">
              <strong>{admin.name}</strong> <span className="muted">· {label(admin.role)}</span>
            </span>
            <button className="btn btn-sm" onClick={logout}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
