import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Car, MapPinned } from 'lucide-react';
import { t } from '../i18n';
import { num, rupees, titleCase } from '../format';
import { AppCta, ErrorBox, Loading, Stars, useApi, usePageTitle } from '../components/ui';

export default function RentalDetail() {
  const { id } = useParams();
  const { data: v, error, loading } = useApi(`/rentals/${id}`);
  const [photo, setPhoto] = useState(0);
  usePageTitle(v ? `${v.make} ${v.model} ${t('for rent')}` : t('Vehicle'));
  if (loading) return <div className="wrap page-body"><Loading rows={2} height={260} /></div>;
  if (error) return <div className="wrap page-body"><ErrorBox error={error} /></div>;
  const r = v.rental || {};
  return (
    <div className="wrap page-body">
      <Link to="/rentals" className="row small" style={{ marginBottom: 16 }}><ArrowLeft size={16} /> {t('All rentals')}</Link>
      <div className="layout-side">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {v.photos?.length ? (
              <>
                <img src={v.photos[photo]} alt={`${v.make} ${v.model}`} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
                {v.photos.length > 1 && (
                  <div className="row" style={{ padding: 10, overflowX: 'auto' }}>
                    {v.photos.map((p, i) => (
                      <button key={p} onClick={() => setPhoto(i)} style={{ border: i === photo ? '2px solid var(--red)' : '2px solid transparent', padding: 0, borderRadius: 8, cursor: 'pointer', background: 'none' }}>
                        <img src={p} alt="" style={{ width: 84, height: 56, objectFit: 'cover', borderRadius: 6 }} />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="vehicle-thumb" style={{ borderRadius: 0, aspectRatio: '16/7' }}><Car size={64} /></div>
            )}
          </div>
          <div className="card">
            <div className="row spread wrap-row">
              <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{v.make} {v.model} {v.year ? <span className="muted" style={{ fontWeight: 500 }}>({num(v.year)})</span> : null}</h1>
              <span className={`pill ${r.available ? 'green' : 'grey'}`}>{r.available ? t('Available') : t('Not available right now')}</span>
            </div>
            <p className="muted">{titleCase(v.vehicleClass)} · {t('{0} seats', [num(v.seats || '–')])} {v.hasAc ? `· ${t('AC')}` : ''} {v.fuelType ? `· ${titleCase(v.fuelType)}` : ''} {v.color ? `· ${v.color}` : ''}</p>
            {v.description && <p>{v.description}</p>}
            {v.features?.length > 0 && <div className="row wrap-row" style={{ gap: 6 }}>{v.features.map((x) => <span key={x} className="pill grey">{titleCase(x)}</span>)}</div>}
            <div style={{ marginTop: 16 }}>
              {r.pricePerDay ? <div className="kv"><span>{t('Price per day')}</span><span>{rupees(r.pricePerDay)}</span></div> : null}
              {r.pricePerHour ? <div className="kv"><span>{t('Price per hour')}</span><span>{rupees(r.pricePerHour)}</span></div> : null}
              {r.minHours ? <div className="kv"><span>{t('Minimum booking')}</span><span>{t('{0} hours', [num(r.minHours)])}</span></div> : null}
              {r.securityDeposit ? <div className="kv"><span>{t('Security deposit')}</span><span>{rupees(r.securityDeposit)}</span></div> : null}
              <div className="kv"><span>{t('Driver')}</span><span>{r.driverOption === 'self_drive' ? t('Self drive') : r.driverOption === 'with_driver' ? t('With driver') : t('Self drive or with driver')}</span></div>
              <div className="kv"><span>{t('Pick-up area')}</span><span>{[r.address, r.city, r.district].filter(Boolean).join(', ')}</span></div>
            </div>
            {r.mapsUrl && <a className="row small" style={{ marginTop: 10 }} href={r.mapsUrl} target="_blank" rel="noreferrer"><MapPinned size={15} /> {t('Open location in Google Maps')}</a>}
            {r.terms && (
              <>
                <h3 style={{ marginTop: 18 }}>{t('Rental terms')}</h3>
                <p className="muted" style={{ whiteSpace: 'pre-line' }}>{r.terms}</p>
              </>
            )}
          </div>
        </div>
        <div className="stack sticky" style={{ gap: 16 }}>
          <div className="card">
            <div className="small muted">{t('Listed by')}</div>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <h3 style={{ margin: 0 }}>{v.owner?.name}</h3>
              {v.owner?.isVerified && <BadgeCheck size={18} color="var(--green)" />}
            </div>
            {v.owner?.rating && <Stars value={v.owner.rating.average} count={v.owner.rating.count} size={13} />}
            <div className="small muted" style={{ marginTop: 4 }}>{[v.owner?.city, v.owner?.district].filter(Boolean).join(', ')}</div>
            <p className="small muted" style={{ marginTop: 12 }}>{t('Agree the dates, price and deposit directly with the owner. GoTrip does not take any payment for rentals.')}</p>
          </div>
          <AppCta title={t('Call the owner from the app')} text={t('Log in with your mobile number in the GoTrip app to see the phone number and WhatsApp.')} />
        </div>
      </div>
    </div>
  );
}
