// Профиль пользователя — данные, баланс, транзакции
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, bookingAPI } from '../../services/api';
import { User, Wallet, History, Eye, EyeOff, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
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
      flash(setMsg, 'Профиль обновлён');
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка');
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await userAPI.changePassword(passForm);
      setPassForm({ currentPassword: '', newPassword: '' });
      flash(setMsg, 'Пароль изменён');
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка');
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || Number(topupAmount) <= 0) return;
    try {
      await userAPI.topUp(Number(topupAmount));
      await refreshUser();
      setTopupAmount('');
      flash(setMsg, `Баланс пополнен на ${topupAmount} MDL`);
      loadTransactions();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка');
    }
  };

  const typeLabels = { topup: 'Пополнение', payment: 'Оплата', refund: 'Возврат' };
  const typeColors = { topup: 'badge-green', payment: 'badge-red', refund: 'badge-yellow' };

  return (
    <div className="page">
      <h2><User size={22} style={{ verticalAlign: 'middle' }} /> Профиль</h2>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Баланс</div>
          <div className="stat-value">{user?.balance?.toFixed(2) || '0.00'} MDL</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Email</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>{user?.email}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Роль</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>{user?.role === 'admin' ? 'Администратор' : 'Пользователь'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['profile', 'password', 'topup', 'history', 'qrcodes'].map(t => (
          <button
            key={t}
            className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setTab(t)}
          >
            {{ profile: 'Данные', password: 'Пароль', topup: 'Пополнить', history: 'История', qrcodes: 'QR-коды' }[t]}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3>Личные данные</h3>
          <form onSubmit={handleProfile}>
            <div className="form-group">
              <label>Имя</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+373..." />
            </div>
            <button type="submit" className="btn btn-primary">Сохранить</button>
          </form>
        </div>
      )}

      {tab === 'password' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3>Смена пароля</h3>
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label>Текущий пароль</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
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
              <label>Новый пароль</label>
              <input
                type="password"
                value={passForm.newPassword}
                onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <button type="submit" className="btn btn-primary">Изменить пароль</button>
          </form>
        </div>
      )}

      {tab === 'topup' && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3><Wallet size={20} /> Пополнение баланса</h3>
          <form onSubmit={handleTopup}>
            <div className="form-group">
              <label>Сумма (MDL)</label>
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
            <button type="submit" className="btn btn-primary">Пополнить</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <h3><History size={20} /> История транзакций</h3>
          {transactions.length === 0 ? (
            <p style={{ color: 'var(--gray-500)' }}>Транзакций пока нет.</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Тип</th>
                    <th>Сумма</th>
                    <th>Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t._id}>
                      <td>{new Date(t.createdAt).toLocaleString('ru')}</td>
                      <td><span className={`badge ${typeColors[t.type]}`}>{typeLabels[t.type]}</span></td>
                      <td style={{ fontWeight: 600, color: t.type === 'payment' ? 'var(--red)' : 'var(--green)' }}>
                        {t.type === 'payment' ? '-' : '+'}{t.amount.toFixed(2)} MDL
                      </td>
                      <td>{t.description || '—'}</td>
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
          <h3><QrCode size={20} /> Мои QR-коды</h3>
          {activeBookings.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Нет активных бронирований с QR-кодами.</p>
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
                    {b.parkingLotId?.name || 'Парковка'} — место {b.parkingSpotId?.spotNumber || '?'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {b.type === 'subscription' ? 'Абонемент' : 'Разовое'} — до {new Date(b.endTime).toLocaleDateString('ru')}
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
