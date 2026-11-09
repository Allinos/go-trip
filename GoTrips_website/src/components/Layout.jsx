import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Car, Menu, X, Phone, Mail, MapPin } from 'lucide-react';
import { t, useLang } from '../i18n';
import { LINKS } from '../api';
import { useApi } from './ui';

export const Brand = () => (
  <Link to="/" className="brand" aria-label="GoTrip home">
    <span className="brand-mark">
      <Car size={20} />
    </span>
    GoTrip
  </Link>
);

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>
        English
      </button>
      <button className={lang === 'as' ? 'on' : ''} onClick={() => setLang('as')}>
        অসমীয়া
      </button>
    </div>
  );
}

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { data: config } = useApi('/config');
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);
  const links = [
    ['/trips', t('Find trips')],
    ['/rentals', t('Rent a vehicle')],
    ['/drivers', t('Hire a driver')],
    ['/partners', t('Become a partner')],
    ['/help', t('Help')],
  ];
  return (
    <>
      <a href="#main" className="sr-only">
        {t('Skip to content')}
      </a>
      <header className="header">
        <div className="wrap">
          <Brand />
          <nav className={`nav ${open ? 'open' : ''}`}>
            {links.map(([to, label]) => (
              <NavLink key={to} to={to}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="header-right">
            <LangToggle />
            <a className="btn sm cta-hide" href={LINKS.userApp || '#download'} target={LINKS.userApp ? '_blank' : undefined} rel="noreferrer">
              {t('Get the app')}
            </a>
            <button className="menu-btn" aria-label={t('Menu')} onClick={() => setOpen(!open)}>
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="wrap">
          <div className="footer-grid">
            <div className="stack">
              <Brand />
              <p className="small" style={{ maxWidth: 320 }}>
                {t('Shared trips between towns, vehicle rentals and verified drivers across Assam. Pay the driver directly, no booking fees.')}
              </p>
              {config?.supportPhone && (
                <a className="row small" href={`tel:${config.supportPhone}`}>
                  <Phone size={15} /> {config.supportPhone}
                </a>
              )}
              {config?.supportEmail && (
                <a className="row small" href={`mailto:${config.supportEmail}`}>
                  <Mail size={15} /> {config.supportEmail}
                </a>
              )}
              <span className="row small">
                <MapPin size={15} /> {LINKS.address}
              </span>
            </div>
            <div>
              <h4>{t('Travel')}</h4>
              <ul>
                <li><Link to="/trips">{t('Find trips')}</Link></li>
                <li><Link to="/rentals">{t('Rent a vehicle')}</Link></li>
                <li><Link to="/drivers">{t('Hire a driver')}</Link></li>
                <li><Link to="/#how">{t('How it works')}</Link></li>
              </ul>
            </div>
            <div>
              <h4>{t('Partners')}</h4>
              <ul>
                <li><Link to="/partners">{t('Become a partner')}</Link></li>
                <li><Link to="/partners#types">{t('Partner types & fees')}</Link></li>
                <li><Link to="/partners#documents">{t('Documents needed')}</Link></li>
                <li><Link to="/help?for=partner">{t('Partner FAQs')}</Link></li>
              </ul>
            </div>
            <div>
              <h4>{t('Company')}</h4>
              <ul>
                <li><Link to="/about">{t('About us')}</Link></li>
                <li><Link to="/contact">{t('Contact')}</Link></li>
                <li><Link to="/safety">{t('Safety')}</Link></li>
                <li><Link to="/privacy">{t('Privacy policy')}</Link></li>
                <li><Link to="/terms">{t('Terms of use')}</Link></li>
                <li><Link to="/refunds">{t('Refund policy')}</Link></li>
                <li><Link to="/delete-account">{t('Delete your account')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {LINKS.company}. {t('All rights reserved.')}</span>
            <span>{t('Made in Assam')} 🇮🇳</span>
          </div>
        </div>
      </footer>
    </>
  );
}
