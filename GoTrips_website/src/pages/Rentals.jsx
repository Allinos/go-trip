import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Car, LocateFixed } from 'lucide-react';
import { t } from '../i18n';
import { num } from '../format';
import { Empty, ErrorBox, Loading, RentalCard, useApi, usePageTitle } from '../components/ui';

const CLASSES = ['hatchback', 'sedan', 'suv', 'muv', 'van', 'mini_bus', 'bus'];

export default function Rentals() {
  usePageTitle(t('Rent a vehicle'), t('Rent cars, SUVs and buses from verified local owners across Assam. Self-drive or with a driver.'));
  const [sp, setSp] = useSearchParams();
  const [geo, setGeo] = useState(null);
  const [geoError, setGeoError] = useState('');
  const f = { district: sp.get('district') || '', vehicleClass: sp.get('class') || '', driverOption: sp.get('driver') || '', availableOnly: sp.get('available') === '1' };
  const set = (k, v) => {
    const n = new URLSearchParams(sp);
    v ? n.set(k, v) : n.delete(k);
    setSp(n);
  };
  const { data: districts } = useApi('/locations/districts');
  const { data, meta, error, loading } = useApi('/rentals', { district: geo ? undefined : f.district, vehicleClass: f.vehicleClass, driverOption: f.driverOption, availableOnly: f.availableOnly ? 'true' : undefined, lat: geo?.lat, lng: geo?.lng, limit: 30 });
  const nearMe = () => {
    if (geo) return setGeo(null);
    setGeoError('');
    navigator.geolocation?.getCurrentPosition(
      (p) => setGeo({ lat: p.coords.latitude.toFixed(4), lng: p.coords.longitude.toFixed(4) }),
      () => setGeoError(t('Location permission was denied. Choose a district instead.'))
    );
  };
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: '2rem' }}>{t('Rent a vehicle')}</h1>
          <p>{t('Cars, SUVs, travellers and buses from verified local owners. See the price and availability, then call the owner from the app.')}</p>
          <div className="row wrap-row" style={{ marginTop: 14 }}>
            <select className="input" style={{ maxWidth: 260 }} value={f.district} onChange={(e) => (setGeo(null), set('district', e.target.value))} aria-label={t('District')}>
              <option value="">{t('All districts')}</option>
              {districts?.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <button className={`chip ${geo ? 'on' : ''}`} onClick={nearMe}><LocateFixed size={15} /> {t('Near me')}</button>
            <button className={`chip ${f.availableOnly ? 'on' : ''}`} onClick={() => set('available', f.availableOnly ? '' : '1')}>{t('Available now')}</button>
            <button className={`chip ${f.driverOption === 'self_drive' ? 'on' : ''}`} onClick={() => set('driver', f.driverOption === 'self_drive' ? '' : 'self_drive')}>{t('Self drive')}</button>
            <button className={`chip ${f.driverOption === 'with_driver' ? 'on' : ''}`} onClick={() => set('driver', f.driverOption === 'with_driver' ? '' : 'with_driver')}>{t('With driver')}</button>
          </div>
          <div className="row wrap-row" style={{ marginTop: 10 }}>
            {CLASSES.map((c) => (
              <button key={c} className={`chip ${f.vehicleClass === c ? 'on' : ''}`} onClick={() => set('class', f.vehicleClass === c ? '' : c)}>{t(c.replace('_', ' ').replace(/^\w/, (x) => x.toUpperCase()))}</button>
            ))}
          </div>
          {geoError && <p className="small" style={{ color: 'var(--red-dark)', marginTop: 8 }}>{geoError}</p>}
        </div>
      </div>
      <div className="wrap page-body">
        {meta && <p className="small muted">{t('{0} vehicle(s)', [num(meta.total)])}{geo ? ` · ${t('within 50 km')}` : ''}</p>}
        {loading ? (
          <div className="grid g3"><Loading rows={1} height={300} /><Loading rows={1} height={300} /><Loading rows={1} height={300} /></div>
        ) : error ? (
          <ErrorBox error={error} />
        ) : data.length ? (
          <div className="grid g3">{data.map((v) => <RentalCard key={v.id} v={v} />)}</div>
        ) : (
          <Empty icon={Car} title={t('No vehicles found')} text={t('Try another district or remove some filters.')} />
        )}
      </div>
    </>
  );
}
