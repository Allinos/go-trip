import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, getToken, setToken } from './lib/api';
import { Spinner } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users, { UserDetail } from './pages/Users';
import Partners from './pages/Partners';
import PartnerDetail from './pages/PartnerDetail';
import Vehicles, { VehicleDetail } from './pages/Vehicles';
import Trips from './pages/Trips';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import Support from './pages/Support';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Faqs from './pages/Faqs';
import Locations from './pages/Locations';
import Admins, { AuditLog } from './pages/Admins';
import GoodsOrders from './pages/GoodsOrders';

const AuthCtx = createContext(null);
export const useAdmin = () => useContext(AuthCtx);
/** Role helpers: support = read + tickets, admin = + verification/moderation, super_admin = everything. */
export const can = (admin, level) => ({ super: admin?.role === 'super_admin', manage: ['super_admin', 'admin'].includes(admin?.role) })[level];

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(!!getToken());
  const qc = useQueryClient();

  useEffect(() => {
    if (getToken())
      api('/auth/me')
        .then((r) => setAdmin(r.data))
        .catch(() => setToken(null))
        .finally(() => setChecking(false));
    const onLogout = () => {
      setAdmin(null);
      qc.clear();
    };
    window.addEventListener('gotrip:logout', onLogout);
    return () => window.removeEventListener('gotrip:logout', onLogout);
  }, [qc]);

  const logout = () => {
    setToken(null);
    setAdmin(null);
    qc.clear();
  };

  if (checking) return <Spinner />;
  if (!admin) return <Login onLogin={(token, a) => (setToken(token), setAdmin(a))} />;

  return (
    <AuthCtx.Provider value={{ admin, logout }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/users/:id" element={<UserDetail />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/partners/:id" element={<PartnerDetail />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/support" element={<Support />} />
          <Route path="/goods-orders" element={<GoodsOrders />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/faqs" element={<Faqs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admins" element={<Admins />} />
          <Route path="/audit" element={<AuditLog />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthCtx.Provider>
  );
}
