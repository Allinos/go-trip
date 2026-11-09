import { Link } from 'react-router-dom';
import { IdCard, CarTaxiFront, KeyRound, Truck, CheckCircle2, FileText, Wallet, Smartphone, ShieldCheck, BarChart3 } from 'lucide-react';
import { t } from '../i18n';
import { num, paise } from '../format';
import { AppButtons, Loading, useApi, usePageTitle } from '../components/ui';
import { FaqList } from './Help';

const ICON = { driver: IdCard, taxi: CarTaxiFront, rental: KeyRound, commercial: Truck };

export default function Partners() {
  usePageTitle(t('Become a partner'), t('Drivers, taxi owners, rental providers and fleet owners: list your service on GoTrip and get customers directly.'));
  const { data: cats, loading } = useApi('/categories');
  const can = (c) =>
    [c.capabilities.driverProfile && t('Marketplace profile customers can call'), c.capabilities.trips && t('Publish start and return trips with stops'), c.capabilities.vehicles && t('List and manage your vehicles'), c.capabilities.rentals && t('Rent out vehicles by the day or hour')].filter(Boolean);
  return (
    <>
      <section className="hero" style={{ paddingBottom: 56 }}>
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">{t('GoTrip Partner')}</span>
            <h1>{t('Grow your driving business')} <span>{t('in Assam')}</span></h1>
            <p className="lead">{t('Publish trips, rent out vehicles or get hired as a driver. Customers find you and call you directly. GoTrip never takes a commission on your fares.')}</p>
            <div className="row wrap-row" style={{ marginTop: 18 }}>
              <AppButtons partner />
              <a className="btn ghost" href="#types">{t('See partner types & fees')}</a>
            </div>
          </div>
          <div className="grid g2">
            {[
              [Wallet, t('Keep 100% of fares'), t('Passengers pay you directly in cash or UPI.')],
              [Smartphone, t('Simple app'), t('Accept requests, share location and see earnings in one place.')],
              [ShieldCheck, t('Verified badge'), t('Verified documents build trust with customers.')],
              [BarChart3, t('Earnings view'), t('Estimated earnings by week, month and vehicle.')],
            ].map(([Icon, h, p]) => (
              <div key={h} className="card feature" style={{ padding: 16 }}>
                <div className="icon" style={{ width: 38, height: 38 }}><Icon size={18} /></div>
                <b>{h}</b>
                <p className="small">{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="types">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">{t('Partner types')}</span>
            <h2>{t('Choose how you work with GoTrip')}</h2>
            <p className="muted">{t('Fees and documents below are live from our system.')}</p>
          </div>
          {loading ? <Loading rows={2} /> : (
            <div className="grid g2">
              {cats?.map((c) => {
                const Icon = ICON[c.code] || CarTaxiFront;
                return (
                  <div key={c.code} className="card feature" id={`type-${c.code}`}>
                    <div className="row spread" style={{ alignItems: 'flex-start' }}>
                      <div className="icon"><Icon size={22} /></div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="price">{c.registrationFee ? paise(c.registrationFee) : t('Free')}</div>
                        <div className="tiny muted">{c.registrationFee ? (c.feeValidityDays ? t('per {0} days', [num(c.feeValidityDays)]) : t('one-time fee')) : t('no registration fee')}</div>
                      </div>
                    </div>
                    <h3>{c.name}</h3>
                    <p>{c.description}</p>
                    <ul className="stack" style={{ listStyle: 'none', padding: 0, marginTop: 14, gap: 6 }}>
                      {can(c).map((x) => <li key={x} className="row small"><CheckCircle2 size={16} color="var(--green)" /> {x}</li>)}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="section alt" id="documents">
        <div className="wrap">
          <div className="section-head">
            <span className="eyebrow">{t('Documents')}</span>
            <h2>{t('What you need to register')}</h2>
            <p className="muted">{t('Take clear photos with your phone. Our team checks them, usually within 24 hours. Documents are stored privately and never shown to customers.')}</p>
          </div>
          <div className="grid g2">
            {cats?.map((c) => (
              <div key={c.code} className="card">
                <h3>{c.name}</h3>
                {['partner', 'vehicle'].map((scope) => {
                  const docs = c.documents.filter((d) => d.scope === scope);
                  if (!docs.length) return null;
                  return (
                    <div key={scope} style={{ marginTop: 10 }}>
                      <div className="tiny muted" style={{ fontWeight: 700, textTransform: 'uppercase' }}>{scope === 'partner' ? t('About you') : t('For each vehicle')}</div>
                      {docs.map((d) => (
                        <div key={d.docType} className="row small" style={{ marginTop: 6, alignItems: 'flex-start' }}>
                          <FileText size={16} style={{ flexShrink: 0, marginTop: 2 }} color={d.isRequired ? 'var(--red)' : 'var(--faint)'} />
                          <span>
                            {d.label} {d.isRequired ? '' : <span className="muted">({t('optional')})</span>}
                            {d.hint && <span className="tiny muted" style={{ display: 'block' }}>{d.hint}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap grid g2" style={{ gap: 40 }}>
          <div>
            <span className="eyebrow">{t('How to join')}</span>
            <h2>{t('Start in about 10 minutes')}</h2>
            <div className="stack steps" style={{ gap: 20, marginTop: 20 }}>
              {[
                [t('Download GoTrip Partner'), t('Log in with your mobile number and the OTP we send you.')],
                [t('Pick your partner type'), t('Tell us your district and business details. You can stop and continue later.')],
                [t('Upload documents'), t('Photos of your licence, Aadhaar and vehicle papers.')],
                [t('Pay the fee if your type has one'), t('Drivers pay a yearly listing fee securely through Razorpay (UPI, cards, net banking).')],
                [t('Go live'), t('Add vehicles and trips, or switch on your driver profile.')],
              ].map(([h, p]) => <div key={h} className="step"><h3>{h}</h3><p>{p}</p></div>)}
            </div>
            <div style={{ marginTop: 24 }}><AppButtons partner /></div>
          </div>
          <div>
            <span className="eyebrow">{t('Questions')}</span>
            <h2>{t('Partner FAQs')}</h2>
            <FaqList audience="partner" />
            <p className="small muted" style={{ marginTop: 14 }}>{t('More questions?')} <Link to="/contact">{t('Contact us')}</Link></p>
          </div>
        </div>
      </section>
    </>
  );
}
