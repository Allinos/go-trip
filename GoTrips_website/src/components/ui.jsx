import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, StarHalf, MapPin, Car, BadgeCheck, Briefcase, Smartphone, SearchX, CloudOff } from 'lucide-react';
import { api, LINKS } from '../api';
import { t } from '../i18n';
import { dateLabel, num, rupees, timeLabel, titleCase } from '../format';

/** Fetch helper for pages: { data, meta, error, loading }. */
export function useApi(path, params, enabled = true) {
  const [state, setState] = useState({ data: null, meta: null, error: null, loading: enabled });
  const key = JSON.stringify([path, params]);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path, params)
      .then((r) => live && setState({ data: r.data, meta: r.meta || null, error: null, loading: false }))
      .catch((e) => live && setState({ data: null, meta: null, error: e, loading: false }));
    return () => {
      live = false;
    };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

/** Sets the browser tab title (and description) per page. */
export function usePageTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | GoTrip` : 'GoTrip – Shared trips, rentals and drivers across Assam';
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description);
  }, [title, description]);
}

export function Stars({ value = 0, size = 15, count }) {
  return (
    <span className="row" style={{ gap: 6 }} aria-label={t('Rated {0} out of 5', [value])}>
      <span className="stars">
        {[1, 2, 3, 4, 5].map((i) =>
          value >= i ? <Star key={i} size={size} fill="currentColor" /> : value >= i - 0.5 ? <StarHalf key={i} size={size} fill="currentColor" /> : <Star key={i} size={size} />
        )}
      </span>
      {count != null && (
        <span className="small muted">
          {num(value.toFixed(1))} ({num(count)})
        </span>
      )}
    </span>
  );
}

export const RatingPill = ({ rating }) =>
  rating ? (
    <span className="pill grey" style={{ color: '#92400e', background: '#fffbeb' }}>
      <Star size={12} fill="#f59e0b" color="#f59e0b" /> {num(rating.average.toFixed(1))} ({num(rating.count)})
    </span>
  ) : null;

export const Loading = ({ rows = 3, height = 120 }) => (
  <div className="stack">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height }} />
    ))}
  </div>
);

export function ErrorBox({ error }) {
  const missing = error?.status === 404;
  return (
    <div className="empty card">
      {missing ? <SearchX size={40} /> : <CloudOff size={40} />}
      <h3>{missing ? t('Not found') : t('Could not load')}</h3>
      <p>{missing ? t('This page may have been removed or is no longer available.') : t('Please check your internet connection and try again.')}</p>
      <Link className="btn outline sm" to="/">
        {t('Go to home page')}
      </Link>
    </div>
  );
}

export const Empty = ({ icon: Icon = SearchX, title, text, action }) => (
  <div className="empty card">
    <Icon size={40} />
    <h3>{title}</h3>
    {text && <p>{text}</p>}
    {action}
  </div>
);

/** Download / open-the-app buttons. Booking and calling need the app (OTP login). */
export function AppButtons({ partner = false, light = false }) {
  const url = partner ? LINKS.partnerApp : LINKS.userApp;
  return (
    <a className="store-btn" href={url || '#download'} target={url ? '_blank' : undefined} rel="noreferrer" style={light ? { background: '#fff', color: '#111' } : undefined}>
      <Smartphone size={22} />
      <span>
        <small>{t('Get it on')}</small>
        {partner ? 'GoTrip Partner' : 'GoTrip'} · Google Play
      </span>
    </a>
  );
}

/** Explains that this action continues in the app. */
export function AppCta({ title, text, partner }) {
  return (
    <div className="card" style={{ background: 'var(--red-tint)', borderColor: '#fecaca' }}>
      <h3>{title}</h3>
      <p className="small muted">{text}</p>
      <AppButtons partner={partner} />
    </div>
  );
}

/** Place field with suggestions from the GoTrip place list (towns, bus stands, districts). */
export function PlaceInput({ label, value, onChange, placeholder, id }) {
  const [list, setList] = useState([]);
  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer.current);
    if (!value || value.trim().length < 2) return setList([]);
    timer.current = setTimeout(() => {
      api('/locations/search', { q: value.trim() })
        .then((r) => setList(r.data.slice(0, 12)))
        .catch(() => setList([]));
    }, 250);
    return () => clearTimeout(timer.current);
  }, [value]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
      <datalist id={`${id}-list`}>
        {list.map((p) => (
          <option key={`${p.type}${p.id || p.name}`} value={p.name}>
            {p.type === 'place' ? p.district : t('District')}
          </option>
        ))}
      </datalist>
    </div>
  );
}

// ------------------------------------------------------------------ cards

export function TripCard({ trip, seats = 1 }) {
  const m = trip.match;
  const q = m ? `?from=${m.pickupSeq}&to=${m.dropSeq}&seats=${seats}` : '';
  return (
    <Link className="card trip-card" to={`/trips/${trip.id}${q}`}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="row wrap-row" style={{ gap: 6 }}>
          <span className={`pill ${trip.tripType === 'return' ? 'blue' : ''}`}>{trip.tripType === 'return' ? t('Return trip') : t('Trip')}</span>
          {trip.driver?.isVerified && (
            <span className="pill green">
              <BadgeCheck size={12} /> {t('Verified')}
            </span>
          )}
          <RatingPill rating={trip.driver?.rating} />
        </div>
        <div className="route">
          <span className="dot" />
          <b>{m?.pickupName || trip.originName}</b>
          <span className="line" />
          <span />
          <span className="dot end" />
          <b>{m?.dropName || trip.destinationName}</b>
        </div>
        <div className="small muted row wrap-row" style={{ gap: 6 }}>
          <Car size={15} /> {trip.vehicle?.make} {trip.vehicle?.model}
          {trip.vehicle?.hasAc ? ` · ${t('AC')}` : ''} · {trip.driver?.name}
        </div>
      </div>
      <div style={{ textAlign: 'right' }} className="stack">
        <div>
          <div className="price">{rupees(m?.farePerSeat ?? trip.pricePerSeat)}</div>
          <div className="tiny muted">{t('per seat')}</div>
        </div>
        <div>
          <b>{timeLabel(trip.departureAt)}</b>
          <div className="small muted">{dateLabel(trip.departureAt)}</div>
        </div>
        <span className={`pill ${trip.availableSeats > 0 ? 'green' : 'grey'}`}>{t('{0} seats left', [num(trip.availableSeats)])}</span>
      </div>
    </Link>
  );
}

export function RentalCard({ v }) {
  return (
    <Link className="card" to={`/rentals/${v.id}`} style={{ padding: 0, overflow: 'hidden' }}>
      {v.photos?.[0] ? <img className="vehicle-thumb" style={{ borderRadius: 0 }} src={v.photos[0]} alt={`${v.make} ${v.model}`} loading="lazy" /> : <div className="vehicle-thumb" style={{ borderRadius: 0 }}><Car size={46} /></div>}
      <div style={{ padding: 16 }}>
        <div className="row spread">
          <h3 style={{ margin: 0 }}>
            {v.make} {v.model}
          </h3>
          <span className={`pill ${v.rental?.available ? 'green' : 'grey'}`}>{v.rental?.available ? t('Available') : t('Not available')}</span>
        </div>
        <div className="small muted" style={{ marginTop: 4 }}>
          {titleCase(v.vehicleClass)} · {t('{0} seats', [num(v.seats || '–')])}
          {v.hasAc ? ` · ${t('AC')}` : ''} {v.fuelType ? `· ${titleCase(v.fuelType)}` : ''}
        </div>
        <div className="row spread" style={{ marginTop: 12 }}>
          <span className="small muted row" style={{ gap: 4 }}>
            <MapPin size={14} /> {[v.rental?.city, v.rental?.district].filter(Boolean).join(', ')}
            {v.distanceKm != null ? ` · ${num(v.distanceKm)} km` : ''}
          </span>
          {v.rental?.pricePerDay ? (
            <span className="price" style={{ fontSize: '1.1rem' }}>
              {rupees(v.rental.pricePerDay)}
              <span className="tiny muted">/{t('day')}</span>
            </span>
          ) : v.rental?.pricePerHour ? (
            <span className="price" style={{ fontSize: '1.1rem' }}>
              {rupees(v.rental.pricePerHour)}
              <span className="tiny muted">/{t('hour')}</span>
            </span>
          ) : null}
        </div>
        <div className="row wrap-row" style={{ gap: 6, marginTop: 10 }}>
          {v.owner?.isVerified && <span className="pill green">{t('Verified owner')}</span>}
          <RatingPill rating={v.owner?.rating} />
          {v.rental?.driverOption && <span className="pill blue">{v.rental.driverOption === 'self_drive' ? t('Self drive') : v.rental.driverOption === 'with_driver' ? t('With driver') : t('Self drive or with driver')}</span>}
        </div>
      </div>
    </Link>
  );
}

export function DriverCard({ d }) {
  return (
    <Link className="card" to={`/drivers/${d.id}`}>
      <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
        {d.photoUrl ? <img className="avatar" src={d.photoUrl} alt="" /> : <span className="avatar">{(d.name || 'D')[0]}</span>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row wrap-row" style={{ gap: 6 }}>
            <h3 style={{ margin: 0 }}>{d.name}</h3>
            {d.isVerified && <BadgeCheck size={18} color="var(--green)" />}
            <RatingPill rating={d.rating} />
          </div>
          {d.headline && <div className="small muted">{d.headline}</div>}
          <div className="row wrap-row" style={{ gap: 6, marginTop: 8 }}>
            <span className="pill">
              <Briefcase size={12} /> {d.hasPriorExperience ? t('{0} yrs exp', [num(d.experienceYears)]) : t('New driver')}
            </span>
            {d.district && (
              <span className="pill grey">
                <MapPin size={12} /> {d.district}
              </span>
            )}
            {d.availability && <span className="pill blue">{titleCase(d.availability)}</span>}
            {!d.isAvailable && <span className="pill grey">{t('Busy')}</span>}
          </div>
          <div className="small muted" style={{ marginTop: 8 }}>
            {t('Drives:')} {d.vehicleTypes?.map(titleCase).join(', ')}
            {d.languages?.length ? ` · ${d.languages.join(', ')}` : ''}
          </div>
          {d.expectedPay && (
            <div style={{ marginTop: 8, fontWeight: 700 }}>
              {rupees(d.expectedPay.min)}
              {d.expectedPay.max && d.expectedPay.max !== d.expectedPay.min ? `–${rupees(d.expectedPay.max)}` : ''} <span className="small muted">{titleCase(d.expectedPay.unit)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ReviewList({ reviews }) {
  if (!reviews?.length) return null;
  return (
    <div className="stack" style={{ gap: 0 }}>
      {reviews.map((r) => (
        <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid var(--line)' }}>
          <div className="row spread">
            <Stars value={r.rating} size={13} />
            <span className="tiny muted">{r.by || t('Customer')}</span>
          </div>
          {r.comment && <p style={{ margin: '6px 0 0' }}>{r.comment}</p>}
          {r.route && <div className="tiny muted">{r.route}</div>}
        </div>
      ))}
    </div>
  );
}
