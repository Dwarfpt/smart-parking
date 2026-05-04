// Страница ввода OTP — 6-значный код из email
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function OtpPage() {
  const { pendingOtp, verifyOtp, resendOtp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef([]);

  // Redirect if no pending OTP
  useEffect(() => {
    if (!pendingOtp) {
      navigate('/login');
    }
  }, [pendingOtp, navigate]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(timerId);
  }, [resendTimer]);

  const handleChange = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next
    if (value && idx < 5) {
      inputs.current[idx + 1]?.focus();
    }

    // Auto-submit on last digit
    if (value && idx === 5) {
      const code = newOtp.join('');
      if (code.length === 6) handleSubmit(code);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      setOtp(text.split(''));
      inputs.current[5]?.focus();
      handleSubmit(text);
    }
  };

  const handleSubmit = async (code) => {
    if (loading) return;
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      setError(t('otpEnter6'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyOtp(otpCode);
      navigate('/parkings');
    } catch (err) {
      setError(err.response?.data?.message || t('otpWrongCode'));
      setOtp(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    }
    setLoading(false);
  };

  const handleResend = async () => {
    try {
      await resendOtp();
      setMsg(t('otpNewSent'));
      setResendTimer(60);
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || t('otpResendError'));
    }
  };

  if (!pendingOtp) return null;

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <ShieldCheck size={48} color="var(--primary)" style={{ marginBottom: 16 }} />
        <h2 className="auth-title">{t('otpTitle')}</h2>
        <p className="auth-subtitle">
          {t('otpSubtitle')}<br />
          <strong>{pendingOtp.email}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-success">{msg}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '24px 0' }}>
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={el => inputs.current[idx] = el}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              style={{
                width: 48,
                height: 56,
                textAlign: 'center',
                fontSize: '1.5rem',
                fontWeight: 700,
                border: '2px solid var(--border-color)',
                borderRadius: 8,
                outline: 'none',
                background: 'var(--input-bg)',
                color: 'var(--text-primary)',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--primary)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
              autoFocus={idx === 0}
            />
          ))}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => handleSubmit()}
          disabled={loading || otp.join('').length !== 6}
          style={{ width: '100%', marginBottom: 16 }}
        >
          {loading ? t('otpVerifying') : t('otpSubmit')}
        </button>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {resendTimer > 0 ? (
            <>{t('otpResendIn')} {resendTimer} {t('otpSec')}</>
          ) : (
            <button
              onClick={handleResend}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              {t('otpResendNew')}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
