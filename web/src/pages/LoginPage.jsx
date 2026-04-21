// Страница входа — email/пароль, Google OAuth
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { login, loginWithGoogle, pendingOtp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pendingOtp) navigate('/verify-otp');
  }, [pendingOtp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      if (!data.requireOtp) {
        navigate(data.user?.role === 'admin' ? '/admin' : '/parkings');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('loginError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!window.google?.accounts) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: async (response) => {
        try {
          setLoading(true);
          const data = await loginWithGoogle(response.credential);
          navigate(data.user?.role === 'admin' ? '/admin' : '/parkings');
        } catch (err) {
          setError(err.response?.data?.message || t('loginErrorGoogle'));
        } finally {
          setLoading(false);
        }
      },
      use_fedcm_for_prompt: true,
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
    );
  }, []);

  return (
    <div className="auth-page">
      {/* Animated background elements */}
      <div className="auth-orb" />
      <div className="auth-grid" />

      <div className="auth-card">
        <h1 className="auth-title">
          <img
            src="/logo.svg"
            alt=""
            style={{
              height: 44,
              verticalAlign: 'middle',
              marginRight: 10,
              filter: 'drop-shadow(0 4px 12px rgba(99,102,241,0.4))'
            }}
          />
          Smart Parking
        </h1>
        <p className="auth-subtitle">{t('authLogin')}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('authEmail')}</label>
            <input
              type="email"
              className="form-control"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('authPassword')}</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('authEntering') : t('authEnter')}
          </button>
        </form>

        <div className="divider">{t('or')}</div>

        <div id="google-signin-btn" style={{ display: 'flex', justifyContent: 'center' }} />

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          {t('authNoAccount')} <Link to="/register">{t('authRegisterLink')}</Link>
        </p>
      </div>
    </div>
  );
}
