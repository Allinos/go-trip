import { useSearchParams, Link } from 'react-router-dom';
import { CarFront } from 'lucide-react';
import { t } from '../i18n';
import { dateLabel, num } from '../format';
import { Empty, ErrorBox, Loading, TripCard, useApi, usePageTitle } from '../components/ui';
import { POPULAR, SearchBox } from './Home';

export default function Trips() {
  const [sp, setSp] = useSearchParams();
  const q = { from: sp.get('from') || '', to: sp.get('to') || '', date: sp.get('date') || '', seats: Number(sp.get('seats')) || 1, type: sp.get('type') || '', page: Number(sp.get('page')) || 1 };
  const route = `${q.from || t('Anywhere')} → ${q.to || t('Anywhere')}`;
  usePageTitle(q.from || q.to ? route : t('Find trips'), t('Shared trips between towns in Assam. Book a seat from any stop and pay the driver directly.'));
  const { data, meta, error, loading } = useApi('/trips/search', { from: q.from, to: q.to, date: q.date, seats: q.seats, type: q.type, page: q.page, limit: 20 });
  // Keep the URL short: drop empty values and the defaults (1 seat, page 1).
  const set = (patch) => setSp(Object.fromEntries(Object.entries({ ...q, page: 1, ...patch }).filter(([k, v]) => v && !((k === 'seats' || k === 'page') && v === 1)).map(([k, v]) => [k, String(v)])));
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: '2rem' }}>{q.from || q.to ? route : t('Find a shared trip')}</h1>
          <p>{t('Trips are published by verified drivers. Your seat is confirmed when the driver accepts your request in the app.')}</p>
          <SearchBox key={sp.toString()} initial={q} />
        </div>
      </div>
      <div className="wrap page-body">
        <div className="row spread wrap-row" style={{ marginBottom: 16 }}>
          <div className="row wrap-row">
            <button className={`chip ${!q.type ? 'on' : ''}`} onClick={() => set({ type: '' })}>{t('All trips')}</button>
            <button className={`chip ${q.type === 'start' ? 'on' : ''}`} onClick={() => set({ type: 'start' })}>{t('Start trips')}</button>
            <button className={`chip ${q.type === 'return' ? 'on' : ''}`} onClick={() => set({ type: 'return' })}>{t('Return trips')}</button>
            {q.date && <button className="chip" onClick={() => set({ date: '' })}>{t('Any day')} ✕</button>}
          </div>
          {meta && <span className="small muted">{q.date ? dateLabel(`${q.date}T12:00:00+05:30`) : t('Next 60 days')} · {t('{0} trip(s)', [num(meta.total)])}</span>}
        </div>
        {loading ? (
          <Loading rows={4} />
        ) : error ? (
          <ErrorBox error={error} />
        ) : data.length ? (
          <>
            <div className="grid g2">
              {data.map((trip) => (
                <TripCard key={trip.id} trip={trip} seats={q.seats} />
              ))}
            </div>
            {meta?.totalPages > 1 && (
              <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
                <button className="btn ghost sm" disabled={q.page <= 1} onClick={() => set({ page: q.page - 1 })}>← {t('Previous')}</button>
                <span className="small muted">{num(q.page)} / {num(meta.totalPages)}</span>
                <button className="btn ghost sm" disabled={q.page >= meta.totalPages} onClick={() => set({ page: q.page + 1 })}>{t('Next')} →</button>
              </div>
            )}
          </>
        ) : (
          <Empty
            icon={CarFront}
            title={q.date ? t('No trips on this day') : t('No trips on this route yet')}
            text={t('Drivers add trips every day. Try another day, a nearby town, or rent a vehicle instead.')}
            action={
              <div className="row wrap-row" style={{ justifyContent: 'center' }}>
                {q.date && <button className="btn sm" onClick={() => set({ date: '' })}>{t('Show any day')}</button>}
                <Link className="btn outline sm" to="/rentals">{t('Rent a vehicle')}</Link>
              </div>
            }
          />
        )}
        <div style={{ marginTop: 30 }}>
          <h3>{t('Popular routes')}</h3>
          <div className="route-chips">
            {POPULAR.map(([a, b]) => (
              <Link key={a + b} className="chip" to={`/trips?from=${a}&to=${b}`}>{a} → {b}</Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
