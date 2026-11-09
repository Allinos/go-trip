import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle, ShieldCheck, Users, Wallet, Languages, Trash2, Smartphone, SearchX } from 'lucide-react';
import { t, useLang } from '../i18n';
import { LINKS } from '../api';
import { useApi, usePageTitle } from '../components/ui';

const UPDATED = '9 November 2026';

function Page({ title, intro, children }) {
  usePageTitle(title);
  return (
    <>
      <div className="page-head">
        <div className="wrap">
          <h1 style={{ fontSize: '2rem' }}>{title}</h1>
          {intro && <p>{intro}</p>}
        </div>
      </div>
      <div className="wrap page-body">{children}</div>
    </>
  );
}

/** Legal pages are written in English; Assamese readers get a short note. */
function Legal({ title, children }) {
  const { lang } = useLang();
  return (
    <Page title={title} intro={`${t('Last updated')}: ${UPDATED}`}>
      <div className="prose">
        {lang === 'as' && <div className="notice amber" style={{ marginBottom: 20 }}>{t('This page is available in English only. If anything is unclear, contact us and we will explain in Assamese.')}</div>}
        {children}
      </div>
    </Page>
  );
}

function useSupport() {
  const { data } = useApi('/config');
  return { phone: data?.supportPhone, email: data?.supportEmail || 'support@gotrip.in' };
}

export function About() {
  return (
    <Page title={t('About GoTrip')} intro={t('GoTrip connects travellers in Assam with drivers, vehicle owners and rental providers — directly, and without commissions.')}>
      <div className="grid g2" style={{ gap: 40, alignItems: 'start' }}>
        <div className="prose">
          <h2 style={{ marginTop: 0 }}>{t('Why we built it')}</h2>
          <p>{t('Every day thousands of cars travel between towns like Nagaon, Tezpur, Jorhat and Guwahati with empty seats, while passengers wait for buses or pay for a full taxi. Families looking for a reliable driver depend on word of mouth, and good vehicle owners struggle to reach customers outside their area.')}</p>
          <p>{t('GoTrip puts all of this in one simple app, in Assamese and English. Drivers publish their trips with the stops on the way, owners list vehicles for rent, and drivers get a public profile. Customers find them and contact them directly.')}</p>
          <h2>{t('How we make money')}</h2>
          <p>{t('Passengers and customers use GoTrip for free, and we never take a share of trip fares or rental payments. Some partner types (such as marketplace drivers) pay a small yearly listing fee, which keeps the platform running and the listings genuine.')}</p>
        </div>
        <div className="grid g2">
          {[
            [Users, t('Direct'), t('Customers talk to drivers and owners directly.')],
            [Wallet, t('No commission'), t('Fares and rental payments go to the partner.')],
            [ShieldCheck, t('Verified'), t('Documents and vehicles are checked by our team.')],
            [Languages, t('Local'), t('Built in Assam, available in Assamese.')],
          ].map(([Icon, h, p]) => (
            <div key={h} className="card feature">
              <div className="icon"><Icon size={20} /></div>
              <b>{h}</b>
              <p className="small">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

export function Contact() {
  const s = useSupport();
  return (
    <Page title={t('Contact us')} intro={t('We usually reply within one working day. For booking questions, the fastest way is to call the driver from the app.')}>
      <div className="grid g3">
        {s.phone && (
          <a className="card feature" href={`tel:${s.phone}`}>
            <div className="icon"><Phone size={20} /></div>
            <h3>{t('Call us')}</h3>
            <p>{s.phone}</p>
            <p className="tiny">{t('Monday to Saturday, 9 am – 7 pm')}</p>
          </a>
        )}
        {s.phone && (
          <a className="card feature" href={`https://wa.me/${s.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
            <div className="icon"><MessageCircle size={20} /></div>
            <h3>WhatsApp</h3>
            <p>{s.phone}</p>
          </a>
        )}
        <a className="card feature" href={`mailto:${s.email}`}>
          <div className="icon"><Mail size={20} /></div>
          <h3>{t('Email')}</h3>
          <p>{s.email}</p>
        </a>
        <div className="card feature">
          <div className="icon"><MapPin size={20} /></div>
          <h3>{t('Office')}</h3>
          <p>{LINKS.company}<br />{LINKS.address}</p>
        </div>
        <div className="card feature">
          <div className="icon"><Smartphone size={20} /></div>
          <h3>{t('In the app')}</h3>
          <p>{t('Account → Help & support → Create a support ticket. You get a notification when we reply.')}</p>
        </div>
      </div>
    </Page>
  );
}

export function Safety() {
  return (
    <Page title={t('Travel safely with GoTrip')} intro={t('Simple steps that keep passengers, drivers and owners safe.')}>
      <div className="grid g2">
        <div className="card">
          <h3>{t('For passengers')}</h3>
          <ul className="stack" style={{ paddingLeft: 18, gap: 8 }}>
            <li>{t('Check the number plate shown on your confirmed booking before you get in.')}</li>
            <li>{t('Prefer drivers with the Verified badge and good ratings.')}</li>
            <li>{t('Use live location: open the driver’s position in Google Maps before pickup.')}</li>
            <li>{t('Share your trip details with family from the trip page.')}</li>
            <li>{t('Pay the fare agreed in the app. Never pay in advance to unknown numbers.')}</li>
            <li>{t('Rate your trip honestly. It helps other travellers.')}</li>
          </ul>
        </div>
        <div className="card">
          <h3>{t('For drivers and owners')}</h3>
          <ul className="stack" style={{ paddingLeft: 18, gap: 8 }}>
            <li>{t('Keep your documents up to date. Expired insurance or licence can lead to suspension.')}</li>
            <li>{t('Only accept requests you can honour. Cancel early if your plans change.')}</li>
            <li>{t('For rentals, check the customer’s ID and agree the deposit in writing.')}</li>
            <li>{t('Never share OTPs. GoTrip staff will never ask for them.')}</li>
          </ul>
        </div>
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3>{t('Report a problem')}</h3>
          <p className="muted">{t('If something went wrong on a trip, create a support ticket in the app or contact us. Our team can suspend partners and remove fake reviews. In an emergency call 112.')}</p>
          <Link className="btn outline sm" to="/contact">{t('Contact us')}</Link>
        </div>
      </div>
    </Page>
  );
}

export function Privacy() {
  const s = useSupport();
  return (
    <Legal title={t('Privacy policy')}>
      <p>This policy explains what personal information {LINKS.company} (“GoTrip”, “we”) collects through the GoTrip and GoTrip Partner apps and this website, why we collect it, and the choices you have. It is written to meet the Digital Personal Data Protection Act, 2023 (India) and Google Play requirements.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><b>Account:</b> mobile number (for OTP login), name, and optionally email, gender, date of birth, city and profile photo.</li>
        <li><b>Partner verification:</b> photos and numbers of documents you upload (driving licence, Aadhaar, PAN, vehicle RC, insurance, permits), business and contact details, and driver profile details.</li>
        <li><b>Trips, bookings and rentals:</b> trips you publish or request, pickup and drop points, seats, fares, booking status, reviews you write, and when you tap Call or WhatsApp on a listing.</li>
        <li><b>Location:</b> partners who switch on location sharing send their position about every 30 seconds while sharing is on. Only the latest position is stored, and sharing stops automatically. Passengers may share their location to find nearby rentals; it is not stored.</li>
        <li><b>Payments:</b> for partner registration fees we receive the payment status, amount and Razorpay payment ID. Card, UPI and bank details are handled by Razorpay and never reach our servers.</li>
        <li><b>Device:</b> push notification token, app version, device model, IP address and basic logs used for security and troubleshooting.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To log you in, run bookings and listings, and send notifications, OTPs and receipts.</li>
        <li>To verify partners and vehicles and keep the platform safe (fraud prevention, abuse reports, rate limits).</li>
        <li>To show your public partner profile, trips, vehicles and ratings to customers. Phone numbers are shown only to logged-in users. Your documents are never shown publicly.</li>
        <li>To provide support and improve the service.</li>
      </ul>
      <p>We do not sell your personal data and we do not show third-party advertising.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li><b>Other users</b>, as needed for the service: a passenger’s name, phone and pickup point go to the driver of the trip they request; a confirmed passenger sees the driver’s phone, vehicle number and shared location.</li>
        <li><b>Service providers</b> who process data for us: Razorpay (payments), SMS providers (OTP and alerts), Google Firebase Cloud Messaging (push notifications), email providers, and cloud hosting and storage.</li>
        <li><b>Authorities</b>, when required by law or to protect someone’s safety.</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>We keep your data while your account is active. When you delete your account we remove your name, phone number, email, photo, saved places and device tokens. We keep anonymised booking records, and partner verification and payment records for as long as Indian tax and legal rules require (generally up to 8 years).</p>
      <h2>Security</h2>
      <p>Data is sent over HTTPS. Documents and photos are stored privately and are only available through short-lived links. OTPs and login tokens are stored in hashed form, and staff access is logged.</p>
      <h2>Your rights</h2>
      <p>You can see and edit your profile in the app, switch off location sharing at any time, and <Link to="/delete-account">delete your account</Link>. You may also ask us for a copy of your data or to correct it by writing to {s.email}.</p>
      <h2>Children</h2>
      <p>GoTrip is not meant for children under 18. Partners must be adults with valid documents.</p>
      <h2>Contact and grievance officer</h2>
      <p>Grievance Officer, {LINKS.company}, {LINKS.address}. Email: {s.email}{s.phone ? `, phone: ${s.phone}` : ''}. We respond within 30 days.</p>
      <p>We may update this policy and will show the new date at the top. Important changes are announced in the apps.</p>
    </Legal>
  );
}

export function Terms() {
  const s = useSupport();
  return (
    <Legal title={t('Terms of use')}>
      <p>These terms apply to the GoTrip apps and website operated by {LINKS.company}. By using GoTrip you agree to them.</p>
      <h2>1. What GoTrip is</h2>
      <p>GoTrip is a listing and communication platform. It helps passengers find shared trips, customers find vehicles for rent and drivers to hire, and helps partners publish these services. GoTrip is not a transport operator, does not own or operate vehicles, and does not employ drivers. The trip, rental or hiring agreement is between the customer and the partner.</p>
      <h2>2. Accounts</h2>
      <ul>
        <li>You log in with your mobile number and an OTP. Keep your phone secure and never share OTPs.</li>
        <li>Information you provide must be true. Partners must hold valid licences, registrations, permits and insurance required by law, and keep them current.</li>
      </ul>
      <h2>3. Bookings and payments</h2>
      <ul>
        <li>A seat request is confirmed only when the partner accepts it. Fares shown are set by partners and are paid directly to the partner (cash or UPI). GoTrip does not collect trip fares or rental payments and charges customers nothing.</li>
        <li>Earnings shown in the Partner app are estimates based on bookings, not payments made by GoTrip.</li>
        <li>Some partner types pay a registration or listing fee through Razorpay. See the <Link to="/refunds">refund policy</Link>.</li>
      </ul>
      <h2>4. Cancellations</h2>
      <p>Passengers can cancel a request or confirmed seat in the app before the trip starts. Partners can decline requests or cancel with a reason; affected passengers are notified. Repeated no-shows or late cancellations may lead to restrictions.</p>
      <h2>5. Your conduct</h2>
      <p>Do not post false listings, fake reviews or offensive content, misuse other users’ phone numbers, carry illegal goods, or try to break or overload the service. We may remove content and suspend accounts that break these rules.</p>
      <h2>6. Ratings and reviews</h2>
      <p>Reviews must describe a real experience. We may hide reviews that are abusive, fake or irrelevant.</p>
      <h2>7. Liability</h2>
      <p>Partners are responsible for their vehicles, driving and the services they offer. To the extent allowed by law, GoTrip is not liable for loss, injury or disputes arising from trips, rentals or hiring arranged through the platform, but we will help with information we hold when there is a complaint or an investigation.</p>
      <h2>8. Changes and law</h2>
      <p>We may change these terms and will show the new date at the top. These terms are governed by the laws of India; courts at Guwahati, Assam have jurisdiction.</p>
      <p>Questions: {s.email}</p>
    </Legal>
  );
}

export function Refunds() {
  const s = useSupport();
  return (
    <Legal title={t('Refund & cancellation policy')}>
      <p>GoTrip charges money only for <b>partner registration / listing fees</b> (for example the yearly fee for marketplace drivers). Passengers and customers never pay GoTrip; trip fares and rental charges are paid directly to partners, so refunds for those are agreed with the partner.</p>
      <h2>Registration and listing fees</h2>
      <ul>
        <li>The fee is shown in the Partner app before you pay, with how long the listing stays active.</li>
        <li>If you were charged twice, or money was deducted but the payment failed, we refund the extra amount in full.</li>
        <li>If your documents are rejected and you cannot complete verification, you can ask for a refund within 7 days of payment.</li>
        <li>Once your listing is live, the fee is not refundable for the remaining period, except where the law requires it.</li>
        <li>If we suspend an account for breaking our terms, the fee is not refunded.</li>
      </ul>
      <h2>How to ask for a refund</h2>
      <p>Write to {s.email}{s.phone ? ` or call ${s.phone}` : ''} with your registered mobile number and the receipt number from your payment email. Approved refunds go back to the original payment method through Razorpay within 5–7 working days.</p>
    </Legal>
  );
}

export function DeleteAccount() {
  const s = useSupport();
  return (
    <Page title={t('Delete your GoTrip account')} intro={t('You can delete your account at any time, from the app or by contacting us.')}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row"><Trash2 size={20} color="var(--red)" /><h3 style={{ margin: 0 }}>{t('Delete from the app')}</h3></div>
          <ol className="stack" style={{ paddingLeft: 20, gap: 6, marginTop: 14 }}>
            <li>{t('Open the GoTrip or GoTrip Partner app and log in.')}</li>
            <li>{t('Go to Account.')}</li>
            <li>{t('Tap “Delete account” and confirm.')}</li>
          </ol>
          <h3 style={{ marginTop: 20 }}>{t('Cannot open the app?')}</h3>
          <p className="muted">{t('Email us from any address with your registered mobile number and the words “Delete my account”. We will confirm by SMS and delete it within 7 days.')}</p>
          <a className="btn outline sm" href={`mailto:${s.email}?subject=Delete my account&body=Registered mobile number: `}>{t('Email a deletion request')}</a>
        </div>
        <div className="card">
          <h3>{t('What gets deleted')}</h3>
          <ul className="stack" style={{ paddingLeft: 18, gap: 6 }}>
            <li>{t('Your name, mobile number, email and profile photo')}</li>
            <li>{t('Saved places and notification tokens; you are logged out everywhere')}</li>
            <li>{t('Pending seat requests are cancelled')}</li>
            <li>{t('Partners: your driver profile, vehicles and upcoming trips are taken off GoTrip, and passengers are notified')}</li>
          </ul>
          <h3 style={{ marginTop: 16 }}>{t('What we keep')}</h3>
          <p className="muted">{t('Anonymised booking history, and partner verification and payment records required by Indian tax and legal rules (up to 8 years). They are no longer linked to your name or phone number.')}</p>
        </div>
      </div>
    </Page>
  );
}

export function NotFound() {
  usePageTitle(t('Page not found'));
  return (
    <div className="wrap page-body">
      <div className="empty card">
        <SearchX size={44} />
        <h2>{t('Page not found')}</h2>
        <p>{t('The page you are looking for does not exist.')}</p>
        <Link className="btn" to="/">{t('Go to home page')}</Link>
      </div>
    </div>
  );
}
