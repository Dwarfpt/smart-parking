// Страница регистрации — форма с валидацией
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterPage() {
  const { register, loginWithGoogle, pendingOtp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
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
      const data = await register(form);
      if (!data.requireOtp) {
        navigate('/parkings');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('registerError'));
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
          await loginWithGoogle(response.credential);
          navigate('/parkings');
        } catch (err) {
          setError(err.response?.data?.message || t('registerErrorGoogle'));
        } finally {
          setLoading(false);
        }
      },
    });
    window.google.accounts.id.renderButton(
      document.getElementById('google-signup-btn'),
      { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
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
        <p className="auth-subtitle">{t('authCreateAccount')}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('authName')}</label>
            <input
              type="text"
              className="form-control"
              placeholder={t('authYourName')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
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
            <label>{t('authPhone')}</label>
            <input
              type="tel"
              className="form-control"
              placeholder="+373 ..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t('authPassword')}</label>
            <input
              type="password"
              className="form-control"
              placeholder={t('authMinChars')}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('authRegBtnLoading') : t('authRegBtn')}
          </button>
        </form>

        <div className="divider">{t('or')}</div>

        <div id="google-signup-btn" style={{ display: 'flex', justifyContent: 'center' }} />

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          {t('authHaveAccount')} <Link to="/login">{t('authLoginLink')}</Link>
        </p>
      </div>
    </div>
  );
}
