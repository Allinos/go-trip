import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { api, download } from '../lib/api';
import { useAction, useFilters, useGet, useList } from '../lib/hooks';
import { Badge, DataTable, Modal, Pagination, SearchBox, Spinner, useToast } from '../components/ui';
import { date, dateTime, inr, label } from '../lib/format';
import { useAdmin, can } from '../App';

export default function Payments() {
  const [f, setF] = useFilters();
  const { data } = useList('payments', '/payments', f);
  const { data: cats } = useGet('categories', '/categories');
  const { admin } = useAdmin();
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const exportCsv = async () => {
    try {
      await download('/payments/export.csv', f, `gotrip-payments-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e) {
      toast(e.message, 'error');
    }
  };
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p>Registration / listing fees collected through Razorpay</p>
        </div>
        {can(admin, 'manage') && (
          <button className="btn" onClick={exportCsv}>
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>
      <div className="card">
        <div className="filters">
          <SearchBox value={f.q || ''} onSearch={(q) => setF({ q })} placeholder="Receipt, Razorpay ID, name or phone" />
          <select className="input" value={f.status || ''} onChange={(e) => setF({ status: e.target.value })}>
            <option value="">Any status</option>
            <option value="paid">Paid</option>
            <option value="created">Pending / not completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <select className="input" value={f.category || ''} onChange={(e) => setF({ category: e.target.value })}>
            <option value="">All partner types</option>
            {cats?.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <input className="input" type="date" value={f.from || ''} onChange={(e) => setF({ from: e.target.value })} />
          <input className="input" type="date" value={f.to || ''} onChange={(e) => setF({ to: e.target.value })} />
        </div>
        {data?.meta && (
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            Paid total for this filter: <strong>{inr(data.meta.paidTotal)}</strong>
          </div>
        )}
        <DataTable
          rows={data?.data}
          onRowClick={(r) => setOpen(r.id)}
          columns={[
            { title: 'Receipt', render: (p) => <span className="mono strong">{p.receipt}</span> },
            { title: 'Partner', render: (p) => (<div><div>{p.user.fullName || '—'}</div><div className="mono small muted">{p.user.phone}</div></div>) },
            { title: 'Type', render: (p) => label(p.categoryCode) },
            { title: 'Amount', render: (p) => <span className="strong">{inr(p.amount)}</span> },
            { title: 'Status', render: (p) => <Badge status={p.status}>{p.status === 'created' ? 'Pending' : undefined}</Badge> },
            { title: 'Method', render: (p) => label(p.method) },
            { title: 'Created', render: (p) => dateTime(p.createdAt) },
            { title: 'Paid', render: (p) => dateTime(p.paidAt) },
          ]}
        />
        <Pagination meta={data?.meta} onPage={(page) => setF({ page })} />
      </div>
      {open && <PaymentModal id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PaymentModal({ id, onClose }) {
  const { admin } = useAdmin();
  const { data: p } = useGet(['payment', id], `/payments/${id}`);
  const reconcile = useAction(() => api(`/payments/${id}/reconcile`, { method: 'POST' }), { success: 'Checked with Razorpay', invalidate: ['payment', 'payments'] });
  return (
    <Modal
      title="Payment details"
      onClose={onClose}
      footer={
        p && p.status !== 'paid' && can(admin, 'manage') ? (
          <button className="btn" disabled={reconcile.isPending} onClick={() => reconcile.mutate()}>
            {reconcile.isPending ? 'Checking…' : 'Re-check with Razorpay'}
          </button>
        ) : null
      }
    >
      {!p ? (
        <Spinner />
      ) : (
        <>
          <dl className="kv">
            <dt>Receipt</dt>
            <dd className="mono">{p.receipt}</dd>
            <dt>Status</dt>
            <dd>
              <Badge status={p.status} />
            </dd>
            <dt>Amount</dt>
            <dd>{inr(p.amount)}</dd>
            <dt>Partner</dt>
            <dd>
              <Link to={`/partners/${p.partnerId}`}>{p.user.fullName || p.user.phone}</Link>
            </dd>
            <dt>Partner type</dt>
            <dd>{label(p.categoryCode)}</dd>
            <dt>Razorpay order</dt>
            <dd className="mono">{p.razorpayOrderId}</dd>
            <dt>Razorpay payment</dt>
            <dd className="mono">{p.razorpayPaymentId || '—'}</dd>
            <dt>Method</dt>
            <dd>{label(p.method)}</dd>
            <dt>Created</dt>
            <dd>{dateTime(p.createdAt)}</dd>
            <dt>Paid</dt>
            <dd>{dateTime(p.paidAt)}</dd>
            <dt>Listing valid until</dt>
            <dd>{date(p.validUntil)}</dd>
            {p.failureReason && (
              <>
                <dt>Note</dt>
                <dd>{p.failureReason}</dd>
              </>
            )}
          </dl>
          <h3 style={{ marginTop: 18 }}>Webhook events</h3>
          {p.webhookEvents.length ? (
            <ul className="small">
              {p.webhookEvents.map((e) => (
                <li key={e.eventId}>
                  {e.event} · {dateTime(e.processedAt)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted small">None received</div>
          )}
        </>
      )}
    </Modal>
  );
}
