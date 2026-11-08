import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { label } from '../lib/format';

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'info') => {
    const id = Math.random();
    setItems((x) => [...x, { id, message, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- Primitives ----------
export const Spinner = () => <div className="spinner" aria-label="Loading" />;
export const Empty = ({ children = 'Nothing here yet' }) => <div className="empty">{children}</div>;
export const Card = ({ title, actions, children, pad = true, className = '' }) => (
  <div className={`card ${className}`}>
    {(title || actions) && (
      <div className="row" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <div className="spacer" />
        {actions}
      </div>
    )}
    {pad ? <div className="card-body">{children}</div> : children}
  </div>
);

const TONE = {
  approved: 'green', active: 'green', paid: 'green', accepted: 'green', completed: 'blue', resolved: 'green', open: 'amber', scheduled: 'blue', ongoing: 'amber', listed: 'green',
  pending: 'amber', in_progress: 'amber', onboarding: 'amber', created: 'amber', unverified: '', processing: 'amber',
  rejected: 'red', blocked: 'red', suspended: 'red', failed: 'red', cancelled: 'red', expired: '', closed: '', refunded: 'blue',
};
export const Badge = ({ status, children, tone }) => <span className={`badge ${tone ?? TONE[status] ?? ''}`}>{children || label(status)}</span>;

export function StatCard({ icon: Icon, label: l, value, sub, to }) {
  const inner = (
    <div className="card stat">
      <div className="label">
        {Icon && (
          <span className="stat-icon">
            <Icon size={16} />
          </span>
        )}
        {l}
      </div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
  return to ? (
    <a href={to} style={{ color: 'inherit', textDecoration: 'none' }}>
      {inner}
    </a>
  ) : (
    inner
  );
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation dialog with optional/required reason text. */
export function ReasonDialog({ title, description, confirmLabel = 'Confirm', danger, requireReason = true, placeholder = 'Reason (shown to the user)', onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-primary' : 'btn-success'}`} disabled={busy || (requireReason && reason.trim().length < 3)} onClick={submit}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      {description && <p className="muted" style={{ marginTop: 0 }}>{description}</p>}
      {(requireReason || placeholder) && <textarea className="input" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder={placeholder} maxLength={500} />}
    </Modal>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return meta ? <div className="pagination">{meta.total} result(s)</div> : null;
  return (
    <div className="pagination">
      <span>
        Page {meta.page} of {meta.pages} · {meta.total} results
      </span>
      <div className="row">
        <button className="btn btn-sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
          Previous
        </button>
        <button className="btn btn-sm" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}

/** Generic table. columns: [{ key, title, render(row) }] */
export function DataTable({ columns, rows, onRowClick, empty }) {
  if (!rows) return <Spinner />;
  if (!rows.length) return <Empty>{empty || 'No records match your filters'}</Empty>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key || c.title} style={c.width ? { width: c.width } : undefined}>
                {c.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className={onRowClick ? 'clickable' : ''} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => (
                <td key={c.key || c.title}>{c.render ? c.render(r) : r[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value ?? 'all'} role="tab" aria-selected={value === t.value} className={`tab ${value === t.value ? 'active' : ''}`} onClick={() => onChange(t.value)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const Field = ({ label: l, hint, children }) => (
  <label className="field">
    <span>{l}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
);

/** Search input that reports changes after the user stops typing. */
export function SearchBox({ value = '', onSearch, placeholder = 'Search' }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    if (v === value) return undefined;
    const t = setTimeout(() => onSearch(v), 350);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return <input className="input search" type="search" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />;
}
