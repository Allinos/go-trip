import { useState } from 'react';
import { api } from '../lib/api';
import { useAction, useGet } from '../lib/hooks';
import { Card, Spinner } from '../components/ui';

export default function Locations() {
  const { data, isLoading } = useGet('locations', '/locations');
  const [district, setDistrict] = useState('');
  const [place, setPlace] = useState({});
  const [filter, setFilter] = useState('');
  const addDistrict = useAction((name) => api('/locations/districts', { method: 'POST', body: { name } }), { success: 'District added', invalidate: ['locations'] });
  const addPlace = useAction((body) => api('/locations/places', { method: 'POST', body }), { success: 'Place added', invalidate: ['locations'] });
  const togglePlace = useAction(({ id, isActive }) => api(`/locations/places/${id}`, { method: 'PATCH', body: { isActive } }), { invalidate: ['locations'] });
  const toggleDistrict = useAction(({ id, isActive }) => api(`/locations/districts/${id}`, { method: 'PATCH', body: { isActive } }), { invalidate: ['locations'] });
  if (isLoading) return <Spinner />;
  const list = data.filter((d) => !filter || d.name.toLowerCase().includes(filter.toLowerCase()) || d.places.some((p) => p.name.toLowerCase().includes(filter.toLowerCase())));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Locations</h1>
          <p>Districts and major points suggested in search and trip creation</p>
        </div>
        <form className="row" onSubmit={(e) => (e.preventDefault(), district.trim() && addDistrict.mutate(district.trim(), { onSuccess: () => setDistrict('') }))}>
          <input className="input" placeholder="New district name" value={district} onChange={(e) => setDistrict(e.target.value)} />
          <button className="btn btn-primary">Add district</button>
        </form>
      </div>
      <input className="input" style={{ maxWidth: 360, marginBottom: 16 }} placeholder="Filter districts or places" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="grid grid-3">
        {list.map((d) => (
          <Card key={d.id} title={<span style={{ opacity: d.isActive ? 1 : 0.5 }}>{d.name}</span>} actions={<button className="btn btn-sm btn-ghost" onClick={() => toggleDistrict.mutate({ id: d.id, isActive: !d.isActive })}>{d.isActive ? 'Hide' : 'Show'}</button>}>
            <div className="row" style={{ gap: 6, marginBottom: 12 }}>
              {d.places.map((p) => (
                <button key={p.id} className={`badge ${p.isActive ? 'blue' : ''}`} style={{ border: 0, cursor: 'pointer', textDecoration: p.isActive ? 'none' : 'line-through' }} title={p.isActive ? 'Click to hide' : 'Click to show'} onClick={() => togglePlace.mutate({ id: p.id, isActive: !p.isActive })}>
                  {p.name}
                </button>
              ))}
            </div>
            <form className="row" onSubmit={(e) => (e.preventDefault(), place[d.id]?.trim() && addPlace.mutate({ districtId: d.id, name: place[d.id].trim() }, { onSuccess: () => setPlace({ ...place, [d.id]: '' }) }))}>
              <input className="input" style={{ flex: 1 }} placeholder="Add place" value={place[d.id] || ''} onChange={(e) => setPlace({ ...place, [d.id]: e.target.value })} />
              <button className="btn btn-sm">Add</button>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
