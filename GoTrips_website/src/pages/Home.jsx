import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRightLeft, MapPinned, Users, Car, IdCard, ShieldCheck, Wallet, Languages, Navigation, Star, Repeat, BellRing, Phone } from 'lucide-react';
import { t } from '../i18n';
import { num, todayIST } from '../format';
import { AppButtons, PlaceInput, TripCard, useApi, usePageTitle } from '../components/ui';

export const POPULAR = [
  ['Nagaon', 'Guwahati'],
  ['Guwahati', 'Nagaon'],
  ['Jorhat', 'Guwahati'],
  ['Tezpur', 'Guwahati'],
  ['Guwahati', 'Shillong'],
  ['Dibrugarh', 'Jorhat'],
];

export function SearchBox({ initial = {} }) {
  const nav = useNavigate();
  const [from, setFrom] = useState(initial.from || '');
  const [to, setTo] = useState(initial.to || '');
  const [date, setDate] = useState(initial.date || '');
  const [seats, setSeats] = useState(initial.seats || 1);
  const go = (e) => {
    e.preventDefault();
    const q = new URLSearchParams(Object.entries({ from: from.trim(), to: to.trim(), date, seats: seats > 1 ? seats : '' }).filter(([, v]) => v));
    nav(`/trips?${q}`);
  };
  return (
    <form className="search-box" onSubmit={go}>
      <PlaceInput id="from" label={t('From')} value={from} onChange={setFrom} placeholder={t('e.g. Nagaon')} />
      <PlaceInput id="to" label={t('To')} value={to} onChange={setTo} placeholder={t('e.g. Guwahati')} />
      <div className="field">
        <label htmlFor="date">{t('Date')}</label>
        <input id="date" className="input" type="date" min={todayIST()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="seats">{t('Seats')}</label>
        <select id="seats" className="input" value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {num(n)}
            </option>
          ))}
        </select>
      </div>
      <button className="btn lg" type="submit">
        <Search size={18} /> {t('Search trips')}
      </button>
    </form>
  );
}

function PhoneMock() {
  return (
    <div className="hero-art">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-top">
            <div className="tiny" style={{ opacity: 0.85 }}>{t('Hi there 👋')}</div>
            <b style={{ fontSize: '1.15rem' }}>{t('Where are you going?')}</b>
          </div>
          <div style={{ padding: 14 }} className="stack">
            {[
              ['Nagaon', 'Guwahati ISBT', '7:30 am', '₹350', 3],
              ['Jagiroad', 'Guwahati ISBT', '9:00 am', '₹200', 2],
              ['Tezpur', 'Guwahati', '2:15 pm', '₹450', 4],
            ].map(([a, b, time, fare, seats]) => (
              <div key={a + time} className="card" style={{ padding: 12, boxShadow: 'none' }}>
                <div className="row spread">
                  <b className="small">{a} → {b}</b>
                  <b style={{ color: 'var(--red-dark)' }}>{fare}</b>
                </div>
                <div className="row spread tiny muted" style={{ marginTop: 4 }}>
                  <span>{time}</span>
                  <span style={{ color: 'var(--green)', fontWeight: 700 }}>{t('{0} seats left', [num(seats)])}</span>
                </div>
              </div>
            ))}
            <div className="btn block" style={{ marginTop: 6 }}>{t('Request 1 seat')}</div>
          </div>
        </div>
      </div>
      <div className="float-card" style={{ left: 0, top: 70 }}>
        <div className="row" style={{ gap: 8 }}>
          <BellRing size={18} color="var(--green)" />
          <div>
            <b>{t('Booking confirmed 🎉')}</b>
            <div className="tiny muted">{t('The driver accepted your request')}</div>
          </div>
        </div>
      </div>
      <div className="float-card" style={{ right: 0, bottom: 70 }}>
        <div className="row" style={{ gap: 8 }}>
          <Navigation size={18} color="var(--red)" />
          <div>
            <b>{t('Driver is on the way')}</b>
            <div className="tiny muted">{t('Open in Google Maps')}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  usePageTitle(null);
  const { data: stats } = useApi('/stats/public');
  const { data: soon } = useApi('/trips/search', { limit: 4 });
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t('Made for Assam')}</span>
            <h1>
              {t('Travel between towns,')} <span>{t('share the ride.')}</span>
            </h1>
            <p className="lead">{t('Find a seat in a car going your way, rent a vehicle or hire a verified driver. Book from any stop on the route and pay the driver directly — no booking fees.')}</p>
            <div className="row wrap-row" style={{ marginTop: 18 }}>
              <AppButtons />
              <Link className="btn ghost" to="/partners">
                {t('Earn with your vehicle')}
              </Link>
            </div>
          </div>
          <PhoneMock />
        </div>
        <div className="wrap">
          <SearchBox />
          <div className="route-chips">
            <span className="small muted">{t('Popular:')}</span>
            {POPULAR.map(([a, b]) => (
              <Link key={a + b} className="chip" to={`/trips?from=${a}&to=${b}`}>
                {a} → {b}
              </Link>
            ))}
          </div>
          {stats && (
            <div className="stats">
              <div className="stat card">
                <b>{num(stats.upcomingTrips)}</b>
                <span>{t('Trips open for booking')}</span>
              </div>
              <div className="stat card">
                <b>{num(stats.rentals)}</b>
                <span>{t('Vehicles for rent')}</span>
              </div>
              <div className="stat card">
                <b>{num(stats.drivers)}</b>
                <span>{t('Drivers to hire')}</span>
              </div>
              <div className="stat card">
                <b>{stats.averageRating ? `★ ${num(stats.averageRating)}` : num(stats.districts)}</b>
                <span>{stats.averageRating ? t('Average rating ({0} reviews)', [num(stats.ratings)]) : t('Districts covered')}</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {soon?.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="row spread wrap-row" style={{ marginBottom: 20 }}>
              <div>
                <span className="eyebrow">{t('Leaving soon')}</span>
                <h2 style={{ margin: 0 }}>{t('Trips you can book now')}</h2>
              </div>
              <Link className="btn outline" to="/trips">
                {t('See all trips')}
              </Link>
            </div>
            <div className="grid g2">
              {soon.map((trip) => (
                <TripCard key={trip.id} trip={trip} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section alt" id="services">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">{t('One app, three ways to travel')}</span>
            <h2>{t('Everything you need to get around Assam')}</h2>
          </div>
          <div className="grid g3">
            {[
              [Users, t('Shared trips'), t('Drivers going between towns publish their trips with every stop on the way. Request a seat from any stop and travel for a fraction of a taxi fare.'), '/trips', t('Find trips')],
              [Car, t('Vehicle rentals'), t('Cars, SUVs, buses and more from local owners. Self-drive or with a driver, priced per day or per hour, with live availability.'), '/rentals', t('Rent a vehicle')],
              [IdCard, t('Hire a driver'), t('Need someone to drive your car for a day trip, the airport or full time? Browse verified drivers with experience, languages and ratings, then call them directly.'), '/drivers', t('Hire a driver')],
            ].map(([Icon, title, text, to, label]) => (
              <div key={to} className="card feature">
                <div className="icon">
                  <Icon size={22} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link to={to} className="btn outline sm" style={{ marginTop: 16 }}>
                  {label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap grid g2" style={{ gap: 48, alignItems: 'center' }}>
          <div>
            <span className="eyebrow">{t('How it works')}</span>
            <h2>{t('Book a seat in four steps')}</h2>
            <div className="stack steps" style={{ gap: 22, marginTop: 24 }}>
              {[
                [t('Search your route'), t('Type where you are and where you want to go. Trips passing through your town show up too.')],
                [t('Request seats'), t('Log in with your mobile number (OTP) and send a request. No payment needed in the app.')],
                [t('Get confirmed'), t('The driver accepts and you get a notification. Call or WhatsApp the driver any time.')],
                [t('Travel and rate'), t('Follow the driver on Google Maps before pickup, pay the fare to the driver, and rate the trip.')],
              ].map(([h, p]) => (
                <div key={h} className="step">
                  <h3>{h}</h3>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="grid g2">
            {[
              [Wallet, t('No booking fees'), t('Pay the fare to the driver in cash or UPI. GoTrip takes no commission.')],
              [ShieldCheck, t('Verified partners'), t('Our team checks licences, vehicle papers and insurance before a vehicle goes live.')],
              [MapPinned, t('Live location'), t('Confirmed passengers can see where the vehicle is on Google Maps.')],
              [Star, t('Honest ratings'), t('Only passengers who travelled, or customers who contacted a driver, can rate.')],
              [ArrowRightLeft, t('Return trips'), t('Drivers post the trip back too, so you can plan both ways.')],
              [Languages, t('অসমীয়া + English'), t('The apps, SMS and notifications work in Assamese and English.')],
            ].map(([Icon, h, p]) => (
              <div key={h} className="card feature" style={{ padding: 16 }}>
                <div className="icon" style={{ width: 38, height: 38, marginBottom: 10 }}>
                  <Icon size={18} />
                </div>
                <b>{h}</b>
                <p className="small">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="wrap grid g2" style={{ gap: 40, alignItems: 'center' }}>
          <div>
            <span className="eyebrow">{t('For drivers and vehicle owners')}</span>
            <h2>{t('Turn empty seats and idle vehicles into income')}</h2>
            <p className="muted">{t('Going to Guwahati anyway? Publish your trip with the stops on the way and fill the empty seats. Own cars or buses? List them for rent. Are you a driver? Get a marketplace profile and let customers call you.')}</p>
            <ul className="stack" style={{ paddingLeft: 0, listStyle: 'none', gap: 10 }}>
              {[
                [Repeat, t('Repeat your daily route in two taps, with one-tap return trips')],
                [Phone, t('Customers call you directly — no lead fees, no commission')],
                [Star, t('Build your reputation with ratings and reviews')],
              ].map(([Icon, text]) => (
                <li key={text} className="row" style={{ alignItems: 'flex-start' }}>
                  <Icon size={18} color="var(--red)" style={{ flexShrink: 0, marginTop: 3 }} /> {text}
                </li>
              ))}
            </ul>
            <div className="row wrap-row" style={{ marginTop: 20 }}>
              <Link className="btn" to="/partners">
                {t('Become a partner')}
              </Link>
              <AppButtons partner />
            </div>
          </div>
          <div className="card" style={{ padding: 26 }}>
            <b>{t('Join in a few minutes')}</b>
            <div className="stack steps" style={{ gap: 18, marginTop: 18 }}>
              {[
                [t('Log in with your mobile number'), t('Download GoTrip Partner and verify with an OTP.')],
                [t('Choose how you work'), t('Driver, taxi owner, rental provider or fleet owner.')],
                [t('Upload your documents'), t('Licence, Aadhaar, RC and insurance photos from your phone.')],
                [t('Go live'), t('Add your vehicle or driver profile. Our team verifies it, usually within 24 hours.')],
              ].map(([h, p]) => (
                <div key={h} className="step">
                  <b>{h}</b>
                  <p>{p}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="download">
        <div className="wrap">
          <div className="cta-band">
            <div>
              <h2 style={{ color: '#fff' }}>{t('Get the GoTrip app')}</h2>
              <p>{t('Book seats, track your driver and get updates on your phone. Free, in English and Assamese.')}</p>
            </div>
            <div className="row wrap-row">
              <AppButtons light />
              <AppButtons partner light />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
