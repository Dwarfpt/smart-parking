// Мои бронирования — список, QR-коды, отмена
import { useState, useEffect } from 'react';
import { bookingAPI } from '../../services/api';
import { Calendar, X, Clock, MapPin, CreditCard, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);
  const [showQR, setShowQR] = useState(null);

  const load = async () => {
    try {
      const res = await bookingAPI.getMy();
      setBookings(res.data.bookings || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3000); };

  const handleCancel = async (id) => {
    if (!confirm('Отменить бронирование? Возврат будет рассчитан пропорционально.')) return;
    setCancelling(id);
    try {
      const res = await bookingAPI.cancel(id);
      flash(setMsg, `Бронирование отменено. Возврат: ${res.data.refundAmount?.toFixed(2) || 0} MDL`);
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка отмены');
    }
    setCancelling(null);
  };

  const statusLabels = {
    active: 'Активно',
    completed: 'Завершено',
    cancelled: 'Отменено',
    expired: 'Истекло',
  };
  const statusColors = {
    active: 'badge-green',
    completed: 'badge-blue',
    cancelled: 'badge-red',
    expired: 'badge-yellow',
  };
  const typeLabels = { reservation: 'Разовое', subscription: 'Абонемент' };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h2><Calendar size={22} style={{ verticalAlign: 'middle' }} /> Мои бронирования</h2>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {bookings.length === 0 ? (
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
            У вас пока нет бронирований.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {bookings.map((b) => (
            <div key={b._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${statusColors[b.status]}`}>{statusLabels[b.status]}</span>
                  <span className="badge badge-blue">{typeLabels[b.type]}</span>
                  {b.subscriptionPeriod && (
                    <span className="badge badge-yellow">{b.subscriptionPeriod}</span>
                  )}
                </div>

                <p style={{ margin: '4px 0', fontSize: '0.95rem' }}>
                  <MapPin size={14} /> {b.parkingLotId?.name || 'Парковка'} — место{' '}
                  <strong>{b.parkingSpotId?.spotNumber || '?'}</strong>
                </p>

                <p style={{ margin: '4px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} />{' '}
                  {new Date(b.startTime).toLocaleString('ru')} — {new Date(b.endTime).toLocaleString('ru')}
                </p>

                <p style={{ margin: '4px 0', fontSize: '0.9rem' }}>
                  <CreditCard size={14} /> Стоимость:{' '}
                  <strong>{b.totalPrice?.toFixed(2)} MDL</strong>
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {b.qrToken && b.status === 'active' && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setShowQR(showQR === b._id ? null : b._id)}
                  >
                    <QrCode size={14} /> QR-код
                  </button>
                )}
                {b.status === 'active' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(b._id)}
                    disabled={cancelling === b._id}
                  >
                    <X size={14} /> {cancelling === b._id ? 'Отменяем...' : 'Отменить'}
                  </button>
                )}
              </div>

              {showQR === b._id && b.qrToken && (
                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '1px solid var(--border-color)', marginTop: 8 }}>
                  <div style={{ textAlign: 'center' }}>
                    <QRCodeSVG
                      value={`smartparking://validate/${b.qrToken}`}
                      size={200}
                      level="H"
                      includeMargin
                    />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 8 }}>
                      Покажите QR-код на входе в парковку
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
