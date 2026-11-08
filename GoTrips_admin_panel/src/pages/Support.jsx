import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAction, useFilters, useList } from '../lib/hooks';
import { Badge, DataTable, Field, Modal, Pagination, SearchBox, Tabs } from '../components/ui';
import { dateTime, label } from '../lib/format';

export default function Support() {
  const [f, setF] = useFilters();
  const { data } = useList('tickets', '/tickets', f);
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Support tickets</h1>
          <p>Questions and issues raised from the user and partner apps</p>
        </div>
      </div>
      <Tabs value={f.status || ''} onChange={(status) => setF({ status })} tabs={[{ value: '', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In progress' }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }]} />
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Subject, message or phone" />
          <select className="input" value={f.app || ''} onChange={(e) => setF({ app: e.target.value })}>
            <option value="">Both apps</option>
            <option value="user">User app</option>
            <option value="partner">Partner app</option>
          </select>
        </div>
        <DataTable
          rows={data?.data}
          onRowClick={setOpen}
          columns={[
            { title: 'Subject', render: (t) => <span className="strong">{t.subject}</span> },
            { title: 'From', render: (t) => (<div><div>{t.user.fullName || '—'}</div><div className="mono small muted">{t.user.phone}</div></div>) },
            { title: 'App', render: (t) => label(t.app) },
            { title: 'Category', render: (t) => label(t.category) },
            { title: 'Status', render: (t) => <Badge status={t.status} /> },
            { title: 'Created', render: (t) => dateTime(t.createdAt) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
      {open && <TicketModal ticket={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function TicketModal({ ticket, onClose }) {
  const [reply, setReply] = useState(ticket.adminReply || '');
  const [status, setStatus] = useState(ticket.status === 'open' ? 'resolved' : ticket.status);
  const save = useAction((body) => api(`/tickets/${ticket.id}`, { method: 'PATCH', body }), { success: 'Ticket updated', invalidate: ['tickets', 'dashboard'] });
  return (
    <Modal
      title={ticket.subject}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" disabled={save.isPending} onClick={async () => (await save.mutateAsync({ status, adminReply: reply.trim() && reply !== ticket.adminReply ? reply.trim() : undefined }), onClose())}>
            Save {reply.trim() && reply !== ticket.adminReply ? '& notify user' : ''}
          </button>
        </>
      }
    >
      <p className="muted small" style={{ marginTop: 0 }}>
        From <Link to={`/users/${ticket.user.id}`}>{ticket.user.fullName || ticket.user.phone}</Link> · {label(ticket.app)} app · {dateTime(ticket.createdAt)}
      </p>
      <div className="card card-body" style={{ whiteSpace: 'pre-wrap', marginBottom: 16 }}>
        {ticket.message}
      </div>
      <Field label="Reply">
        <textarea className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply. The user gets a notification." />
      </Field>
      <Field label="Status">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
      </Field>
    </Modal>
  );
}
