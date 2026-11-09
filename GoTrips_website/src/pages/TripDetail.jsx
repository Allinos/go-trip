import { useParams, useSearchParams, Link } from 'react-router-dom';
import { BadgeCheck, Car, MapPinned, Snowflake, Package, Share2, ArrowLeft } from 'lucide-react';
import { t } from '../i18n';
import { dateLabel, num, rupees, timeLabel, titleCase } from '../format';
import { AppCta, ErrorBox, Loading, ReviewList, Stars, useApi, usePageTitle } from '../components/ui';

function fareBetween(trip, a, b) {
  const s = trip.stops;
  const last = s.length - 1;
  const at = (i) => (i === 0 ? 0 : i === last ? (s[i].fareFromStart ?? trip.pricePerSeat) : s[i].fareFromStart);
  const fa = at(a);
  const fb = at(b);
  return fa != null && fb != null && fb > fa ? fb - fa : trip.pricePerSeat;
}

export default function TripDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { data: trip, error, loading } = useApi(`/trips/${id}`);
  usePageTitle(trip ? `${trip.originName} → ${trip.destinationName}, ${dateLabel(trip.departureAt)}` : t('Trip'));
  if (loading) return <div className="wrap page-body"><Loading rows={2} height={220} /></div>;
  if (error) return <div className="wrap page-body"><ErrorBox error={error} /></div>;
  const last = trip.stops.length - 1;
  const from = Math.min(Number(sp.get('from')) || 0, last - 1);
  const to = Math.max(Number(sp.get('to')) || last, from + 1);
  const seats = Number(sp.get('seats')) || 1;
  const fare = fareBetween(trip, from, to);
  const closed = trip.status !== 'scheduled' || !trip.bookingOpen || new Date(trip.departureAt) < new Date();
  const share = () => {
    const text = `${trip.originName} → ${trip.destinationName}, ${dateLabel(trip.departureAt)} ${timeLabel(trip.departureAt)} — ${rupees(trip.pricePerSeat)}`;
    if (navigator.share) navigator.share({ title: 'GoTrip', text, url: window.location.href }).catch(() => {});
    else navigator.clipboard?.writeText(`${text} ${window.location.href}`);
  };
  return (
    <div className="wrap page-body">
      <Link to="/trips" className="row small" style={{ marginBottom: 16 }}><ArrowLeft size={16} /> {t('All trips')}</Link>
      <div className="layout-side">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="row spread wrap-row">
              <div className="row wrap-row" style={{ gap: 6 }}>
                <span className={`pill ${trip.tripType === 'return' ? 'blue' : ''}`}>{trip.tripType === 'return' ? t('Return trip') : t('Trip')}</span>
                {closed ? <span className="pill grey">{t('Bookings closed')}</span> : <span className="pill green">{t('{0} seats left', [num(trip.availableSeats)])}</span>}
              </div>
              <button className="btn ghost sm" onClick={share}><Share2 size={15} /> {t('Share')}</button>
            </div>
            <h1 style={{ fontSize: '1.9rem', marginTop: 14 }}>{trip.originName} → {trip.destinationName}</h1>
            <p className="muted" style={{ fontSize: '1.05rem' }}>{dateLabel(trip.departureAt)} · {timeLabel(trip.departureAt)}{trip.arrivalAt ? ` – ${timeLabel(trip.arrivalAt)}` : ''}</p>
            <h3 style={{ marginTop: 20 }}>{t('Route and stops')}</h3>
            <ul className="timeline">
              {trip.stops.map((s, i) => (
                <li key={s.seq} className={i === from || i === to ? 'hl' : ''}>
                  <span className="tdot" />
                  <div>
                    <b>{s.placeName}</b>
                    {s.district && <span className="small muted"> · {s.district}</span>}
                    {i === from && <span className="pill green" style={{ marginLeft: 8 }}>{t('Get on')}</span>}
                    {i === to && <span className="pill" style={{ marginLeft: 8 }}>{t('Get off')}</span>}
                  </div>
                  <span className="small muted">{i > 0 && s.fareFromStart != null ? rupees(s.fareFromStart) : ''}</span>
                </li>
              ))}
            </ul>
            <a className="row small" href={trip.routeMapsUrl} target="_blank" rel="noreferrer"><MapPinned size={15} /> {t('View route on Google Maps')}</a>
          </div>

          <div className="card">
            <div className="row" style={{ gap: 14 }}>
              {trip.driver?.photoUrl ? <img className="avatar" src={trip.driver.photoUrl} alt="" /> : <span className="avatar">{(trip.driver?.name || 'D')[0]}</span>}
              <div>
                <div className="row" style={{ gap: 6 }}>
                  <h3 style={{ margin: 0 }}>{trip.driver?.name}</h3>
                  {trip.driver?.isVerified && <BadgeCheck size={18} color="var(--green)" />}
                </div>
                {trip.driver?.rating ? <Stars value={trip.driver.rating.average} count={trip.driver.rating.count} size={14} /> : <span className="small muted">{t('New on GoTrip')}</span>}
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <div className="kv"><span>{t('Vehicle')}</span><span>{trip.vehicle.make} {trip.vehicle.model} · {titleCase(trip.vehicle.vehicleClass)}</span></div>
              {trip.vehicle.color && <div className="kv"><span>{t('Colour')}</span><span>{trip.vehicle.color}</span></div>}
              <div className="kv"><span>{t('Number plate')}</span><span>{trip.vehicle.registrationNumber}</span></div>
              <div className="kv"><span>{t('Comfort')}</span><span className="row" style={{ gap: 6 }}>{trip.vehicle.hasAc ? <><Snowflake size={14} /> {t('AC')}</> : t('Non-AC')}</span></div>
              {trip.acceptsParcels && <div className="kv"><span>{t('Parcels')}</span><span className="row" style={{ gap: 6 }}><Package size={14} /> {t('Accepts small parcels')}</span></div>}
            </div>
            {trip.vehicle.photo ? <img src={trip.vehicle.photo} alt="" style={{ borderRadius: 12, marginTop: 14, width: '100%', maxHeight: 280, objectFit: 'cover' }} /> : null}
            {trip.notes && <p className="muted" style={{ marginTop: 14 }}>“{trip.notes}”</p>}
            {trip.reviews?.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <b className="small" style={{ textTransform: 'uppercase', color: 'var(--muted)' }}>{t('What passengers say')}</b>
                <ReviewList reviews={trip.reviews} />
              </div>
            )}
          </div>
        </div>

        <div className="stack sticky" style={{ gap: 16 }}>
          <div className="card">
            <div className="small muted">{trip.stops[from].placeName} → {trip.stops[to].placeName}</div>
            <div className="row spread" style={{ marginTop: 6 }}>
              <span className="price">{rupees(fare)}</span>
              <span className="small muted">{t('per seat')}</span>
            </div>
            {seats > 1 && <div className="kv"><span>{t('{0} seats', [num(seats)])}</span><span>{rupees(fare * seats)}</span></div>}
            <p className="small muted" style={{ marginTop: 10 }}>{t('No booking fee. Pay cash or UPI to the driver.')}</p>
            <div className="notice small"><Car size={18} style={{ flexShrink: 0 }} /> {t('Phone numbers are shown in the app after you log in, to protect drivers from spam.')}</div>
          </div>
          <AppCta title={closed ? t('Find another trip in the app') : t('Request your seat in the GoTrip app')} text={t('Open this route in the app, log in with your mobile number and send the request. You get a notification when the driver accepts.')} />
        </div>
      </div>
    </div>
  );
}
