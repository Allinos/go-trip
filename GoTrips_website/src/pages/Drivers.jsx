import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, IdCard } from 'lucide-react';
import { t } from '../i18n';
import { num } from '../format';
import { DriverCard, Empty, ErrorBox, Loading, useApi, usePageTitle } from '../components/ui';

const WORK = [['', 'Any work'], ['outstation', 'Outstation'], ['personal', 'Personal'], ['local', 'Local'], ['airport', 'Airport'], ['commercial', 'Commercial']];

export default function Drivers() {
  usePageTitle(t('Hire a driver'), t('Verified drivers in Assam for outstation trips, airport runs and full-time jobs. See experience and ratings, then call directly.'));
  const [sp, setSp] = useSearchParams();
  const f = { q: sp.get('q') || '', district: sp.get('district') || '', workType: sp.get('work') || '', verifiedOnly: sp.get('verified') === '1', top: sp.get('top') === '1' };
  const [q, setQ] = useState(f.q);
  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    setSp(n);
  };
  const { data: districts } = useApi('/locations/districts');
  const { data, meta, error, loading } = useApi('/marketplace/drivers', { q: f.q, district: f.district, workType: f.workType, verifiedOnly: f.verifiedOnly ? 'true' : undefined, ...(f.top ? { sort: 'rating', minRating: 4 } : {}), limit: 30 });
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: '2rem' }}>{t('Hire a driver')}</h1>
          <p>{t('Browse driver profiles with experience, licence types, languages and ratings. Call or WhatsApp a driver directly from the app — no agents, no commission.')}</p>
          <form className="row wrap-row" style={{ marginTop: 14 }} onSubmit={(e) => (e.preventDefault(), set('q', q.trim()))}>
            <input className="input" style={{ maxWidth: 320 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Search name or town')} aria-label={t('Search name or town')} />
            <select className="input" style={{ maxWidth: 240 }} value={f.district} onChange={(e) => set('district', e.target.value)} aria-label={t('District')}>
              <option value="">{t('All districts')}</option>
              {districts?.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <button className="btn" type="submit"><Search size={16} /> {t('Search')}</button>
          </form>
          <div className="row wrap-row" style={{ marginTop: 12 }}>
            <button className={`chip ${f.verifiedOnly ? 'on' : ''}`} onClick={() => set('verified', f.verifiedOnly ? '' : '1')}>✓ {t('Verified only')}</button>
            <button className={`chip ${f.top ? 'on' : ''}`} onClick={() => set('top', f.top ? '' : '1')}>★ {t('4+ rated')}</button>
            {WORK.map(([v, l]) => (
              <button key={v} className={`chip ${f.workType === v ? 'on' : ''}`} onClick={() => set('work', v)}>{t(l)}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap page-body">
        {meta && <p className="small muted">{t('{0} driver(s) found', [num(meta.total)])}</p>}
        {loading ? <Loading rows={3} /> : error ? <ErrorBox error={error} /> : data.length ? (
          <div className="grid g2">{data.map((d) => <DriverCard key={d.id} d={d} />)}</div>
        ) : (
          <Empty icon={IdCard} title={t('No drivers found')} text={t('Try another district or remove some filters.')} />
        )}
      </div>
    </>
  );
}
