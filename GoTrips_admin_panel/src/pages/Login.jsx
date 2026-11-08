import { useState } from 'react';
import { Car } from 'lucide-react';
import { api } from '../lib/api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api('/auth/login', { method: 'POST', body: { email, password } });
      onLogin(r.data.token, r.data.admin);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-wrap">
      <form className="card login-card" onSubmit={submit}>
        <div className="row" style={{ marginBottom: 20 }}>
          <div className="brand-badge" style={{ color: '#fff' }}>
            <Car size={18} />
          </div>
          <div>
            <h1>GoTrip Admin</h1>
            <div className="muted small">Sign in to manage the platform</div>
          </div>
        </div>
        {error && <div className="alert red">{error}</div>}
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }} disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
