import { useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../lib/api';
import { useAction, useGet } from '../lib/hooks';
import { Badge, DataTable, Field, Modal } from '../components/ui';
import { label } from '../lib/format';

export default function Faqs() {
  const { data } = useGet('faqs', '/faqs');
  const [edit, setEdit] = useState(null);
  const del = useAction((id) => api(`/faqs/${id}`, { method: 'DELETE' }), { success: 'Deleted', invalidate: ['faqs'] });
  return (
    <>
      <div className="page-head">
        <div>
          <h1>FAQs</h1>
          <p>Help content shown in the apps</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEdit({ audience: 'all', isActive: true, sortOrder: 0 })}>
          <Plus size={15} /> Add FAQ
        </button>
      </div>
      <div className="card">
        <DataTable
          rows={data}
          onRowClick={setEdit}
          columns={[
            { title: 'Question', render: (f) => <span className="strong">{f.question}</span> },
            { title: 'Shown in', render: (f) => label(f.audience === 'all' ? 'both apps' : `${f.audience} app`) },
            { title: 'Assamese', render: (f) => (f.translations?.as?.question ? <Badge tone="green">Yes</Badge> : <Badge tone="amber">Missing</Badge>) },
            { title: 'Order', key: 'sortOrder' },
            { title: 'Status', render: (f) => <Badge tone={f.isActive ? 'green' : ''}>{f.isActive ? 'Visible' : 'Hidden'}</Badge> },
            { title: '', render: (f) => <button className="btn btn-sm btn-danger" onClick={(e) => (e.stopPropagation(), window.confirm('Delete this FAQ?') && del.mutate(f.id))}>Delete</button> },
          ]}
        />
      </div>
      {edit && <FaqModal faq={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function FaqModal({ faq, onClose }) {
  const [f, setF] = useState({ ...faq, asQuestion: faq.translations?.as?.question || '', asAnswer: faq.translations?.as?.answer || '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = useAction(() => {
    const body = { audience: f.audience, question: f.question, answer: f.answer, sortOrder: Number(f.sortOrder) || 0, isActive: !!f.isActive, translations: { as: { question: f.asQuestion.trim() || null, answer: f.asAnswer.trim() || null } } };
    return faq.id ? api(`/faqs/${faq.id}`, { method: 'PATCH', body }) : api('/faqs', { method: 'POST', body });
  }, { success: 'Saved', invalidate: ['faqs'] });
  return (
    <Modal title={faq.id ? 'Edit FAQ' : 'New FAQ'} onClose={onClose} footer={<><button className="btn" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!f.question || !f.answer || save.isPending} onClick={async () => (await save.mutateAsync(), onClose())}>Save</button></>}>
      <Field label="Question">
        <input className="input" value={f.question || ''} onChange={set('question')} />
      </Field>
      <Field label="Answer">
        <textarea className="input" value={f.answer || ''} onChange={set('answer')} />
      </Field>
      <Field label="Question in Assamese (অসমীয়া)" hint="Shown to users who chose Assamese. Leave empty to show English.">
        <input className="input" lang="as" value={f.asQuestion} onChange={set('asQuestion')} />
      </Field>
      <Field label="Answer in Assamese">
        <textarea className="input" lang="as" value={f.asAnswer} onChange={set('asAnswer')} />
      </Field>
      <div className="grid grid-2">
        <Field label="Shown in">
          <select className="input" value={f.audience} onChange={set('audience')}>
            <option value="all">Both apps</option>
            <option value="user">User app</option>
            <option value="partner">Partner app</option>
          </select>
        </Field>
        <Field label="Order">
          <input className="input" type="number" value={f.sortOrder} onChange={set('sortOrder')} />
        </Field>
      </div>
      <label className="check">
        <input type="checkbox" checked={!!f.isActive} onChange={set('isActive')} /> Visible
      </label>
    </Modal>
  );
}
