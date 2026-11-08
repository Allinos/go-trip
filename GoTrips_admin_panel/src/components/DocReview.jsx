import { FileText } from 'lucide-react';
import { Badge } from './ui';
import { date, label } from '../lib/format';

const isPdf = (url) => url && /\.pdf(\?|$)/i.test(url);

function Thumb({ url, title }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" title={`Open ${title}`}>
      {isPdf(url) ? (
        <span className="row">
          <FileText size={16} /> PDF
        </span>
      ) : (
        <img src={url} alt={title} loading="lazy" />
      )}
    </a>
  );
}

/**
 * Document review grid. `decisions` = { [docId]: { status, reason } } controlled by parent.
 */
export default function DocReview({ documents, requirements = [], decisions, setDecisions, editable }) {
  const reqByType = Object.fromEntries(requirements.map((r) => [r.docType, r]));
  const missing = requirements.filter((r) => r.isRequired && !documents.find((d) => d.docType === r.docType));
  return (
    <div className="grid grid-2">
      {documents.map((d) => {
        const dec = decisions?.[d.id];
        const expired = d.expiryDate && new Date(d.expiryDate) < new Date();
        return (
          <div key={d.id} className="doc-card">
            <div className="row">
              <span className="strong">{reqByType[d.docType]?.label || label(d.docType)}</span>
              <span className="spacer" />
              <Badge status={dec?.status || d.status} />
            </div>
            <div className="doc-thumbs">
              <Thumb url={d.frontUrl} title="front" />
              <Thumb url={d.backUrl} title="back" />
            </div>
            <div className="small muted">
              {d.docNumber && (
                <>
                  No: <span className="mono">{d.docNumber}</span> ·{' '}
                </>
              )}
              {d.expiryDate && <span style={expired ? { color: 'var(--primary-600)', fontWeight: 600 } : undefined}>Expires {date(d.expiryDate)}</span>} · Uploaded {date(d.updatedAt || d.createdAt)}
            </div>
            {d.rejectionReason && d.status === 'rejected' && <div className="small" style={{ color: 'var(--primary-600)' }}>Rejected: {d.rejectionReason}</div>}
            {editable && (
              <div className="row">
                <button className={`btn btn-sm ${dec?.status === 'approved' ? 'btn-success' : ''}`} onClick={() => setDecisions({ ...decisions, [d.id]: { status: 'approved' } })}>
                  Looks good
                </button>
                <button className={`btn btn-sm ${dec?.status === 'rejected' ? 'btn-primary' : 'btn-danger'}`} onClick={() => setDecisions({ ...decisions, [d.id]: { status: 'rejected', reason: dec?.reason || '' } })}>
                  Reject
                </button>
                {dec?.status === 'rejected' && <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Why? e.g. photo is blurry" value={dec.reason} onChange={(e) => setDecisions({ ...decisions, [d.id]: { status: 'rejected', reason: e.target.value } })} />}
              </div>
            )}
          </div>
        );
      })}
      {missing.map((r) => (
        <div key={r.docType} className="doc-card" style={{ borderStyle: 'dashed' }}>
          <span className="strong">{r.label}</span>
          <span className="muted small">Required — not uploaded yet</span>
        </div>
      ))}
      {!documents.length && !missing.length && <div className="muted">No documents.</div>}
    </div>
  );
}
