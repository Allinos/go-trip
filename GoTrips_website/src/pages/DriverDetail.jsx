import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { t } from '../i18n';
import { num, rupees, titleCase } from '../format';
import { AppCta, ErrorBox, Loading, ReviewList, Stars, useApi, usePageTitle } from '../components/ui';

const DOC = { driving_license: 'Driving licence', aadhaar: 'Aadhaar', pan: 'PAN card', police_verification: 'Police verification' };

export default function DriverDetail() {
  const { id } = useParams();
  const { data: d, error, loading } = useApi(`/marketplace/drivers/${id}`);
  usePageTitle(d ? `${d.name} – ${t('driver')}` : t('Driver'));
  if (loading) return <div className="wrap page-body"><Loading rows={2} height={240} /></div>;
  if (error) return <div className="wrap page-body"><ErrorBox error={error} /></div>;
  const rows = [
    [t('Can drive'), d.vehicleTypes?.map(titleCase).join(', ')],
    [t('Licence'), [d.licenseTypes?.join(', '), d.licenseValid === false ? t('expired') : d.licenseValid ? t('valid') : null].filter(Boolean).join(' · ')],
    [t('Automatic cars'), d.canDriveAutomatic ? t('Yes') : t('No')],
    [t('Work'), d.workTypes?.map(titleCase).join(', ')],
    [t('Availability'), titleCase(d.availability)],
    [t('Expected pay'), d.expectedPay ? `${rupees(d.expectedPay.min)}${d.expectedPay.max && d.expectedPay.max !== d.expectedPay.min ? `–${rupees(d.expectedPay.max)}` : ''} ${titleCase(d.expectedPay.unit)}` : null],
    [t('Languages'), d.languages?.join(', ')],
    [t('Based in'), [d.city, d.district].filter(Boolean).join(', ')],
    [t('Also works in'), d.serviceAreas?.join(', ')],
    [t('Experience'), d.experienceDetails],
    [t('Education'), d.education],
    [t('Own vehicle'), d.hasOwnVehicle ? t('Yes') : t('No')],
  ].filter(([, v]) => v);
  return (
    <div className="wrap page-body">
      <Link to="/drivers" className="row small" style={{ marginBottom: 16 }}><ArrowLeft size={16} /> {t('All drivers')}</Link>
      <div className="layout-side">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card row wrap-row" style={{ gap: 20, alignItems: 'center' }}>
            {d.photoUrl ? <img className="avatar lg" src={d.photoUrl} alt="" /> : <span className="avatar lg">{(d.name || 'D')[0]}</span>}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className="row" style={{ gap: 8 }}>
                <h1 style={{ fontSize: '1.8rem', margin: 0 }}>{d.name}</h1>
                {d.isVerified && <BadgeCheck size={24} color="var(--green)" />}
              </div>
              {d.headline && <p className="muted" style={{ margin: '4px 0' }}>{d.headline}</p>}
              {d.rating && <Stars value={d.rating.average} count={d.rating.count} />}
              <div className="row wrap-row" style={{ gap: 6, marginTop: 8 }}>
                <span className="pill">{d.hasPriorExperience ? t('{0} years experience', [num(d.experienceYears)]) : t('New driver')}</span>
                <span className={`pill ${d.isAvailable ? 'green' : 'grey'}`}>{d.isAvailable ? t('Available') : t('Busy')}</span>
                {d.age ? <span className="pill grey">{t('{0} yrs', [num(d.age)])}</span> : null}
              </div>
            </div>
          </div>
          {d.bio && <div className="card"><h3>{t('About')}</h3><p className="muted" style={{ margin: 0 }}>{d.bio}</p></div>}
          <div className="card">
            {rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
          </div>
          <div className="card">
            <div className="row spread">
              <h3 style={{ margin: 0 }}>{t('Ratings')}</h3>
              {d.rating ? <Stars value={d.rating.average} count={d.rating.count} /> : <span className="small muted">{t('No ratings yet')}</span>}
            </div>
            <ReviewList reviews={d.reviews} />
            <p className="tiny muted" style={{ marginTop: 10 }}>{t('Only customers who contacted this driver through GoTrip can rate them.')}</p>
          </div>
        </div>
        <div className="stack sticky" style={{ gap: 16 }}>
          <div className="card">
            <h3>{t('Verification')}</h3>
            {d.verifiedDocuments?.length ? d.verifiedDocuments.map((x) => (
              <div key={x} className="row small" style={{ marginTop: 6 }}><CheckCircle2 size={17} color="var(--green)" /> {t(DOC[x] || titleCase(x))} — {t('verified by GoTrip')}</div>
            )) : <p className="small muted">{t('Documents are being verified.')}</p>}
            <div className="kv" style={{ marginTop: 10 }}><span>{t('On GoTrip since')}</span><span>{new Date(d.memberSince).getFullYear()}</span></div>
            <div className="kv"><span>{t('Profile views')}</span><span>{num(d.profileViews || 0)}</span></div>
          </div>
          <AppCta title={t('Call {0} from the app', [d.name])} text={t('Log in with your mobile number in the GoTrip app to call or WhatsApp this driver. After hiring, you can rate them.')} />
        </div>
      </div>
    </div>
  );
}
