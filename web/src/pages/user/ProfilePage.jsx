// Профиль пользователя — данные, баланс, транзакции
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { userAPI, bookingAPI } from '../../services/api';
import { User, Wallet, History, Eye, EyeOff, QrCode, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const { t, lang } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '' });
  const [topupAmount, setTopupAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tab, setTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, email: user.email, phone: user.phone || '' });
    }
    loadTransactions();
    loadActiveBookings();
  }, [user]);

  const loadTransactions = async () => {
    try {
      const res = await userAPI.getTransactions();
      setTransactions(res.data.transactions || []);
    } catch { /* ignore */ }
  };

  const loadActiveBookings = async () => {
    try {
      const res = await bookingAPI.getMy({ status: 'active' });
      setActiveBookings(res.data.bookings || []);
    } catch { /* ignore */ }
  };

  const flash = (setter, text) => {
    setter(text);
    setTimeout(() => setter(''), 3000);
  };

  const handleProfile = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await userAPI.updateProfile(form);
      await refreshUser();
      flash(setMsg, t('profileUpdated'));
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await userAPI.changePassword(passForm);
      setPassForm({ currentPassword: '', newPassword: '' });
      flash(setMsg, t('passwordChanged'));
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || Number(topupAmount) <= 0) return;
    try {
      await userAPI.topUp(Number(topupAmount));
      await refreshUser();
      setTopupAmount('');
      flash(setMsg, `${t('topupSuccess')} ${topupAmount} MDL`);
      loadTransactions();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const typeLabels = { topup: t('txTopup'), payment: t('txPayment'), refund: t('txRefund') };
  const typeColors = { topup: 'badge-green', payment: 'badge-red', refund: 'badge-yellow' };

  return (
    <div className="page">
      <h2><User size={22} style={{ verticalAlign: 'middle' }} /> {t('profileTitle')}</h2>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">{t('balance')}</div>
          <div className="stat-value">{user?.balance?.toFixed(2) || '0.00'} MDL</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('authEmail')}</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>{user?.email}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('role')}</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>{user?.role === 'admin' ? t('roleAdmin') : t('roleUser')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['profile', 'password', 'security', 'topup', 'history', 'qrcodes'].map(tabKey => (
          <button
            key={tabKey}
            className={`btn ${tab === tabKey ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setTab(tabKey)}
          >
            {{ profile: t('tabData'), password: t('tabPassword'), security: t('tabSecurity'), topup: t('tabTopup'), history: t('tabHistory'), qrcodes: t('tabQR') }[tabKey]}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3>{t('personalData')}</h3>
          <form onSubmit={handleProfile}>
            <div className="form-group">
              <label>{t('authName')}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('authEmail')}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>{t('authPhone')}</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+373..." />
            </div>
            <button type="submit" className="btn btn-primary">{t('save')}</button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3>{t('changePassword')}</h3>
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label>{t('currentPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passForm.currentPassword}
                  onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>{t('newPassword')}</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passForm.newPassword}
                onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary">{t('changePasswordBtn')}</button>
          </form>
        </div>
      )}

      {tab === 'security' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3><Shield size={20} /> {t('securityTitle')}</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            {t('securityDesc')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>{t('twoFAEmail')}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {user?.twoFactorEnabled ? t('twoFAOn') : t('twoFAOff')}
              </div>
            </div>
            <button
              className={`btn ${user?.twoFactorEnabled ? 'btn-secondary' : 'btn-primary'} btn-sm`}
              onClick={async () => {
                try {
                  await userAPI.toggle2FA();
                  await refreshUser();
                  flash(setMsg, user?.twoFactorEnabled ? t('twoFADisabled') : t('twoFAEnabled'));
                } catch (err) {
                  flash(setError, err.response?.data?.message || t('error'));
                }
              }}
            >
              {user?.twoFactorEnabled ? t('twoFATurnOff') : t('twoFATurnOn')}
            </button>
          </div>
        </div>
      )}

      {tab === 'topup' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3><Wallet size={20} /> {t('topupTitle')}</h3>
          <form onSubmit={handleTopup}>
            <div className="form-group">
              <label>{t('topupAmount')}</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={topupAmount}
                onChange={e => setTopupAmount(e.target.value)}
                placeholder="100"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[50, 100, 200, 500].map(a => (
                <button key={a} type="button" className="btn btn-secondary btn-sm" onClick={() => setTopupAmount(String(a))}>
                  {a} MDL
                </button>
              ))}
            </div>
            <button type="submit" className="btn btn-primary">{t('topupBtn')}</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3><History size={20} /> {t('historyTitle')}</h3>
          {transactions.length === 0 ? (
            <p style={{ color: 'var(--gray-500)' }}>{t('historyEmpty')}</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('date')}</th>
                    <th>{t('txType')}</th>
                    <th>{t('txAmount')}</th>
                    <th>{t('txDescription')}</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx._id}>
                      <td>{new Date(tx.createdAt).toLocaleString(lang)}</td>
                      <td><span className={`badge ${typeColors[tx.type]}`}>{typeLabels[tx.type]}</span></td>
                      <td style={{ fontWeight: 600, color: tx.type === 'payment' ? 'var(--red)' : 'var(--green)' }}>
                        {tx.type === 'payment' ? '-' : '+'}{tx.amount.toFixed(2)} MDL
                      </td>
                      <td>{tx.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'qrcodes' && (
        <div className="card">
          <h3><QrCode size={20} /> {t('qrTitle')}</h3>
          {activeBookings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>{t('qrEmpty')}</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {activeBookings.filter(b => b.qrToken).map(b => (
                <div key={b._id} style={{ textAlign: 'center', padding: 16, border: '1px solid var(--border-color)', borderRadius: 'var(--radius)' }}>
                  <QRCodeSVG
                    value={`smartparking://validate/${b.qrToken}`}
                    size={180}
                    level="H"
                    includeMargin
                  />
                  <p style={{ fontWeight: 600, margin: '8px 0 4px' }}>
                    {b.parkingLotId?.name || t('parkingsMapTitle')} — {t('spot')} {b.parkingSpotId?.spotNumber || '?'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {b.type === 'subscription' ? t('subscription') : t('oneTime')} — {new Date(b.endTime).toLocaleDateString(lang)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
