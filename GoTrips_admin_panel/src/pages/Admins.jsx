import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAction, useFilters, useGet, useList } from '../lib/hooks';
import { Badge, DataTable, Field, Modal, Pagination, SearchBox } from '../components/ui';
import { dateTime, label } from '../lib/format';
import { useAdmin } from '../App';

export default function Admins() {
  const { data } = useGet('admins', '/admins');
  const { admin: me } = useAdmin();
  const [edit, setEdit] = useState(null);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin users</h1>
          <p>Support: read-only + tickets · Admin: verification & moderation · Super admin: everything incl. fees and settings</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit({ role: 'admin', isActive: true })}>
          <Plus size={15} /> Add admin
        </button>
      </div>
      <div className="card">
        <DataTable
          rows={data}
          onRowClick={(a) => a.id !== me.id && setEdit(a)}
          columns={[
            { title: 'Name', render: (a) => <span className="strong">{a.name}{a.id === me.id ? ' (you)' : ''}</span> },
            { title: 'Email', key: 'email' },
            { title: 'Role', render: (a) => <Badge tone="blue">{label(a.role)}</Badge> },
            { title: 'Status', render: (a) => <Badge tone={a.isActive ? 'green' : 'red'}>{a.isActive ? 'Active' : 'Disabled'}</Badge> },
            { title: 'Last login', render: (a) => dateTime(a.lastLoginAt) },
          ]}
        />
      </div>
      {edit && <AdminModal admin={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function AdminModal({ admin, onClose }) {
  const isNew = !admin.id;
  const [f, setF] = useState({ name: '', email: '', password: '', ...admin });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = useAction(() => (isNew ? api('/admins', { method: 'POST', body: { name: f.name, email: f.email, role: f.role, password: f.password } }) : api(`/admins/${admin.id}`, { method: 'PATCH', body: { name: f.name, role: f.role, isActive: f.isActive, ...(f.password ? { password: f.password } : {}) } })), { success: 'Saved', invalidate: ['admins'] });
  return (
    <Modal title={isNew ? 'Add admin' : `Edit ${admin.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={save.isPending || !f.name || (isNew && (!f.email || f.password.length < 10))} onClick={async () => (await save.mutateAsync(), onClose())}>Save</button></>}>
      <Field label="Name">
        <input className="input" value={f.name} onChange={set('name')} />
      </Field>
      {isNew && (
        <Field label="Email">
          <input className="input" type="email" value={f.email} onChange={set('email')} />
        </Field>
      )}
      <Field label="Role">
        <select className="input" value={f.role} onChange={set('role')}>
          <option value="support">Support</option>
          <option value="admin">Admin</option>
          <option value="super_admin">Super admin</option>
        </select>
      </Field>
      <Field label={isNew ? 'Password' : 'New password (optional)'} hint="At least 10 characters. Changing it logs this admin out.">
        <input className="input" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} />
      </Field>
      {!isNew && (
        <label className="check">
          <input type="checkbox" checked={!!f.isActive} onChange={set('isActive')} /> Active
        </label>
      )}
    </Modal>
  );
}

export function AuditLog() {
  const [f, setF] = useFilters();
  const { data } = useList('audit', '/audit-logs', f);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Audit log</h1>
          <p>Every admin action is recorded here</p>
        </div>
      </div>
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Action, e.g. vehicle.approve" />
          <select className="input" value={f.entityType || ''} onChange={(e) => setF({ entityType: e.target.value })}>
            <option value="">All entities</option>
            {['partner', 'vehicle', 'user', 'trip', 'payment', 'category', 'requirement', 'settings', 'ticket', 'admin'].map((x) => (
              <option key={x} value={x}>
                {label(x)}
              </option>
            ))}
          </select>
        </div>
        <DataTable
          rows={data?.data}
          columns={[
            { title: 'When', render: (l) => dateTime(l.createdAt) },
            { title: 'Admin', render: (l) => l.admin?.name || <span className="muted">—</span> },
            { title: 'Action', render: (l) => <span className="mono">{l.action}</span> },
            { title: 'Entity', render: (l) => `${l.entityType}${l.entityId ? ` #${l.entityId}` : ''}` },
            { title: 'Details', render: (l) => <span className="mono small muted">{l.details ? JSON.stringify(l.details).slice(0, 120) : ''}</span> },
            { title: 'IP', render: (l) => <span className="mono small">{l.ip}</span> },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
    </>
  );
}
