import { Link, useSearchParams } from 'react-router-dom';
import { ChevronDown, Phone, Mail, LifeBuoy } from 'lucide-react';
import { t } from '../i18n';
import { Loading, useApi, usePageTitle } from '../components/ui';

export function FaqList({ audience }) {
  const { data, loading } = useApi('/faqs', { audience });
  if (loading) return <Loading rows={3} height={56} />;
  return (
    <div className="faq">
      {data?.map((f) => (
        <details key={f.id}>
          <summary>{f.question} <ChevronDown size={18} /></summary>
          <p>{f.answer}</p>
        </details>
      ))}
    </div>
  );
}

export default function Help() {
  usePageTitle(t('Help & FAQs'));
  const [sp, setSp] = useSearchParams();
  const audience = sp.get('for') === 'partner' ? 'partner' : 'user';
  const { data: config } = useApi('/config');
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: '2rem' }}>{t('Help & FAQs')}</h1>
          <p>{t('Answers to common questions. In the app you can also create a support ticket from Account → Help & support.')}</p>
          <div className="row wrap-row" style={{ marginTop: 10 }}>
            <button className={`chip ${audience === 'user' ? 'on' : ''}`} onClick={() => setSp({})}>{t('For passengers & customers')}</button>
            <button className={`chip ${audience === 'partner' ? 'on' : ''}`} onClick={() => setSp({ for: 'partner' })}>{t('For partners & drivers')}</button>
          </div>
        </div>
      </div>
      <div className="wrap page-body layout-side">
        <FaqList key={audience} audience={audience} />
        <div className="card stack sticky">
          <div className="row"><LifeBuoy size={20} color="var(--red)" /><h3 style={{ margin: 0 }}>{t('Still need help?')}</h3></div>
          {config?.supportPhone && <a className="row" href={`tel:${config.supportPhone}`}><Phone size={16} /> {config.supportPhone}</a>}
          {config?.supportEmail && <a className="row" href={`mailto:${config.supportEmail}`}><Mail size={16} /> {config.supportEmail}</a>}
          <Link className="btn outline sm" to="/contact">{t('Contact us')}</Link>
          <Link className="small" to="/safety">{t('Safety tips for travellers')}</Link>
        </div>
      </div>
    </>
  );
}
