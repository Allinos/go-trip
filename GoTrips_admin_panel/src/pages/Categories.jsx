import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAction, useGet } from '../lib/hooks';
import { Badge, Card, Field, Modal, Spinner } from '../components/ui';
import { inr } from '../lib/format';
import { useAdmin, can } from '../App';

const CAPS = [
  ['hasDriverProfile', 'Driver marketplace profile'],
  ['canListVehicles', 'List vehicles'],
  ['canCreateTrips', 'Create start / return trips'],
  ['canListRentals', 'List vehicles for rent'],
  ['canViewGoodsOrders', 'See goods transport orders'],
];

export default function Categories() {
  const { admin } = useAdmin();
  const { data, isLoading } = useGet('categories', '/categories');
  const [edit, setEdit] = useState(null);
  const [req, setReq] = useState(null);
  const isSuper = can(admin, 'super');
  const delReq = useAction((id) => api(`/requirements/${id}`, { method: 'DELETE' }), { success: 'Requirement removed', invalidate: ['categories'] });
  if (isLoading) return <Spinner />;
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Partner types & fees</h1>
          <p>Configure each partner type: registration fee, what they can do and which documents they must upload</p>
        </div>
        {isSuper && (
          <button className="btn btn-primary" onClick={() => setEdit({})}>
            <Plus size={15} /> New partner type
          </button>
        )}
      </div>
      {!isSuper && <div className="alert">Only super admins can change partner types and fees.</div>}
      <div className="grid" style={{ gap: 16 }}>
        {data.map((c) => (
          <Card
            key={c.id}
            title={
              <span className="row">
                {c.name} <span className="mono muted small">{c.code}</span> {!c.isActive && <Badge tone="red">Hidden</Badge>}
              </span>
            }
            actions={isSuper && <button className="btn btn-sm" onClick={() => setEdit(c)}>Edit</button>}
          >
            <div className="grid grid-3">
              <div>
                <h3>Registration fee</h3>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{c.registrationFee ? inr(c.registrationFee) : 'Free'}</div>
                <div className="muted small">{c.registrationFee ? (c.feeValidityDays ? `Valid ${c.feeValidityDays} days` : 'Lifetime') : ''}</div>
                <div className="muted small" style={{ marginTop: 8 }}>
                  {c._count.partners} partner(s)
                </div>
              </div>
              <div>
                <h3>Can</h3>
                {CAPS.filter(([k]) => c[k]).map(([k, l]) => (
                  <div key={k} className="small">
                    ✓ {l}
                  </div>
                ))}
              </div>
              <div>
                <h3>Required documents</h3>
                {['partner', 'vehicle'].map((scope) => {
                  const list = c.requirements.filter((r) => r.scope === scope);
                  if (!list.length) return null;
                  return (
                    <div key={scope} style={{ marginBottom: 8 }}>
                      <div className="muted small strong">{scope === 'partner' ? 'Partner' : 'Each vehicle'}</div>
                      {list.map((r) => (
                        <div key={r.id} className="row small" style={{ gap: 6 }}>
                          <span>
                            {r.label} {!r.isRequired && <span className="muted">(optional)</span>}
                          </span>
                          {isSuper && (
                            <>
                              <button className="btn btn-ghost btn-sm" onClick={() => setReq({ ...r, categoryId: c.id })}>
                                Edit
                              </button>
                              <button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => window.confirm(`Remove "${r.label}"?`) && delReq.mutate(r.id)}>
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {isSuper && (
                  <button className="btn btn-sm" onClick={() => setReq({ categoryId: c.id, scope: 'partner', isRequired: true })}>
                    <Plus size={13} /> Add document
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      {edit && <CategoryModal category={edit} onClose={() => setEdit(null)} />}
      {req && <RequirementModal req={req} onClose={() => setReq(null)} />}
    </>
  );
}

function CategoryModal({ category, onClose }) {
  const isNew = !category.id;
  const [f, setF] = useState({ code: '', name: '', description: '', registrationFee: 0, feeValidityDays: '', isActive: true, sortOrder: 0, ...category, feeRupees: (category.registrationFee || 0) / 100 });
  const save = useAction(
    () => {
      const body = { name: f.name, description: f.description || null, registrationFee: Math.round(Number(f.feeRupees) * 100), feeValidityDays: f.feeValidityDays ? Number(f.feeValidityDays) : null, isActive: f.isActive, sortOrder: Number(f.sortOrder) || 0, ...Object.fromEntries(CAPS.map(([k]) => [k, !!f[k]])) };
      return isNew ? api('/categories', { method: 'POST', body: { ...body, code: f.code } }) : api(`/categories/${category.id}`, { method: 'PATCH', body });
    },
    { success: 'Saved', invalidate: ['categories'] }
  );
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (
    <Modal title={isNew ? 'New partner type' : `Edit ${category.name}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={save.isPending || !f.name || (isNew && !f.code)} onClick={async () => (await save.mutateAsync(), onClose())}>Save</button></>}>
      {isNew && (
        <Field label="Code" hint="Lowercase, e.g. bike_taxi. Cannot be changed later.">
          <input className="input" value={f.code} onChange={set('code')} />
        </Field>
      )}
      <Field label="Name">
        <input className="input" value={f.name} onChange={set('name')} />
      </Field>
      <Field label="Description (shown in the partner app)">
        <input className="input" value={f.description || ''} onChange={set('description')} />
      </Field>
      <div className="grid grid-2">
        <Field label="Registration fee (₹)" hint="0 = free">
          <input className="input" type="number" min="0" value={f.feeRupees} onChange={set('feeRupees')} />
        </Field>
        <Field label="Fee validity (days)" hint="Empty = lifetime">
          <input className="input" type="number" min="1" value={f.feeValidityDays ?? ''} onChange={set('feeValidityDays')} />
        </Field>
      </div>
      {CAPS.map(([k, l]) => (
        <label key={k} className="check">
          <input type="checkbox" checked={!!f[k]} onChange={set(k)} /> {l}
        </label>
      ))}
      <label className="check">
        <input type="checkbox" checked={!!f.isActive} onChange={set('isActive')} /> Visible in the partner app
      </label>
    </Modal>
  );
}

function RequirementModal({ req, onClose }) {
  const isNew = !req.id;
  const [f, setF] = useState({ label: '', hint: '', requiresNumber: false, requiresExpiry: false, requiresBack: false, sortOrder: 0, docType: '', ...req });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = useAction(
    () => {
      const body = { label: f.label, hint: f.hint || null, isRequired: !!f.isRequired, requiresNumber: !!f.requiresNumber, requiresExpiry: !!f.requiresExpiry, requiresBack: !!f.requiresBack, sortOrder: Number(f.sortOrder) || 0 };
      return isNew ? api(`/categories/${req.categoryId}/requirements`, { method: 'POST', body: { ...body, scope: f.scope, docType: f.docType } }) : api(`/requirements/${req.id}`, { method: 'PATCH', body });
    },
    { success: 'Saved', invalidate: ['categories'] }
  );
  return (
    <Modal title={isNew ? 'Add required document' : `Edit ${req.label}`} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={save.isPending || !f.label || (isNew && !f.docType)} onClick={async () => (await save.mutateAsync(), onClose())}>Save</button></>}>
      {isNew && (
        <div className="grid grid-2">
          <Field label="Applies to">
            <select className="input" value={f.scope} onChange={set('scope')}>
              <option value="partner">Partner (once)</option>
              <option value="vehicle">Each vehicle</option>
            </select>
          </Field>
          <Field label="Document code" hint="e.g. driving_license">
            <input className="input" value={f.docType} onChange={set('docType')} />
          </Field>
        </div>
      )}
      <Field label="Label shown to partner">
        <input className="input" value={f.label} onChange={set('label')} />
      </Field>
      <Field label="Help text">
        <input className="input" value={f.hint || ''} onChange={set('hint')} />
      </Field>
      {[
        ['isRequired', 'Required'],
        ['requiresNumber', 'Ask for document number'],
        ['requiresExpiry', 'Ask for expiry date'],
        ['requiresBack', 'Needs back side photo'],
      ].map(([k, l]) => (
        <label key={k} className="check">
          <input type="checkbox" checked={!!f[k]} onChange={set(k)} /> {l}
        </label>
      ))}
    </Modal>
  );
}
