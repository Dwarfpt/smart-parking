// Детали парковки — места, бронирование, абонемент, WebSocket
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { parkingAPI, bookingAPI, tariffAPI } from '../../services/api';
import { connectSocket, getSocket, subscribeToParking, unsubscribeFromParking } from '../../services/socket';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Clock, Car, Calendar, CreditCard } from 'lucide-react';

export default function ParkingDetailPage() {
  const { id } = useParams();
  const { user, refreshUser } = useAuth();
  const [lot, setLot] = useState(null);
  const [spots, setSpots] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const [bookingType, setBookingType] = useState('reservation');
  const [subPeriod, setSubPeriod] = useState('month');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [lotRes, spotsRes] = await Promise.all([
        parkingAPI.getOne(id),
        parkingAPI.getSpots(id),
      ]);
      setLot(lotRes.data.parkingLot);
      setSpots(spotsRes.data.spots || []);
      // Load tariffs for this specific parking lot
      const lotData = lotRes.data.parkingLot;
      const tariffRes = await tariffAPI.getAll(lotData._id);
      setTariffs(tariffRes.data.tariffs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    connectSocket(token);
    subscribeToParking(id);
    const socket = getSocket();
    const handler = (data) => {
      if (data.spots) setSpots(data.spots);
    };
    socket?.on('spots:update', handler);
    return () => {
      socket?.off('spots:update', handler);
      unsubscribeFromParking(id);
    };
  }, [id]);

  // Helper: format Date to "YYYY-MM-DDThh:mm" in LOCAL time (for datetime-local input)
  const toLocalInput = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Set default times
  useEffect(() => {
    if (!startTime) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 15);
      setStartTime(toLocalInput(now));
      const end = new Date(now.getTime() + 3600000); // +1 hour
      setEndTime(toLocalInput(end));
    }
  }, [startTime]);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 4000); };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedSpot) { flash(setError, 'Выберите место'); return; }
    setSubmitting(true);
    setError('');
    try {
      if (bookingType === 'reservation') {
        await bookingAPI.create({
          parkingSpotId: selectedSpot,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
        });
        flash(setMsg, 'Бронирование создано! Списание произведено.');
      } else {
        await bookingAPI.createSubscription({
          parkingSpotId: selectedSpot,
          period: subPeriod,
        });
        flash(setMsg, `Абонемент (${subPeriod}) оформлен!`);
      }
      await refreshUser();
      await loadData();
      setSelectedSpot(null);
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка бронирования');
    }
    setSubmitting(false);
  };

  const statusColors = {
    free: '#22c55e',
    occupied: '#ef4444',
    reserved: '#f59e0b',
    maintenance: '#6b7280',
  };
  const statusLabels = {
    free: 'Свободно',
    occupied: 'Занято',
    reserved: 'Забронировано',
    maintenance: 'Обслуживание',
  };
  const subLabels = { week: 'Неделя', month: 'Месяц', '3months': '3 месяца', year: 'Год' };

  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!lot) return <div className="page"><p>Парковка не найдена.</p></div>;

  const lotTariff = tariffs.find((t) => t._id === lot.tariff?._id || t._id === lot.tariff) || lot.tariff || tariffs[0];

  return (
    <div className="page">
      <h2><MapPin size={22} style={{ verticalAlign: 'middle' }} /> {lot.name}</h2>
      <p style={{ color: 'var(--gray-500)', marginBottom: 16 }}>{lot.address}</p>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Всего мест</div>
          <div className="stat-value">{lot.totalSpots}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Свободно</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>
            {spots.filter(s => s.status === 'free').length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Часы работы</div>
          <div className="stat-value" style={{ fontSize: '1rem' }}>
            <Clock size={16} /> {lot.workingHours?.open} – {lot.workingHours?.close}
          </div>
        </div>
        {lotTariff && (
          <div className="stat-card">
            <div className="stat-label">Цена</div>
            <div className="stat-value" style={{ fontSize: '1rem' }}>
              {lotTariff.pricePerHour} MDL/ч
            </div>
          </div>
        )}
      </div>

      {/* Spots legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        {Object.entries(statusLabels).map(([s, label]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: statusColors[s] }} />
            <span style={{ fontSize: '0.85rem' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, border: '3px solid var(--primary)', background: 'var(--primary-light)' }} />
          <span style={{ fontSize: '0.85rem' }}>Выбрано</span>
        </div>
      </div>

      {/* Spots grid */}
      <div className="parking-spots-grid" style={{ marginBottom: 24 }}>
        {spots.map((spot) => {
          const isFree = spot.status === 'free';
          const isSelected = selectedSpot === spot._id;
          return (
            <div
              key={spot._id}
              className={`parking-spot ${spot.status} ${isSelected ? 'selected' : ''}`}
              style={{
                background: isSelected ? 'var(--primary-light)' : statusColors[spot.status],
                color: '#fff',
                border: isSelected ? '3px solid var(--primary)' : '2px solid transparent',
                borderRadius: 8,
                padding: '12px 8px',
                textAlign: 'center',
                cursor: isFree ? 'pointer' : 'default',
                opacity: isFree || isSelected ? 1 : 0.6,
                transition: 'all 0.2s',
              }}
              onClick={() => isFree && setSelectedSpot(isSelected ? null : spot._id)}
            >
              <Car size={20} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{spot.spotNumber}</div>
              <div style={{ fontSize: '0.7rem' }}>{statusLabels[spot.status]}</div>
            </div>
          );
        })}
      </div>

      {/* Booking form */}
      {selectedSpot && (
        <div className="card" style={{ maxWidth: 500 }}>
          <h3><Calendar size={18} /> Бронирование — место {spots.find(s => s._id === selectedSpot)?.spotNumber}</h3>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className={`btn ${bookingType === 'reservation' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setBookingType('reservation')}
            >
              Разовое
            </button>
            <button
              className={`btn ${bookingType === 'subscription' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setBookingType('subscription')}
            >
              Абонемент
            </button>
          </div>

          <form onSubmit={handleBook}>
            {bookingType === 'reservation' ? (
              <>
                <div className="form-group">
                  <label>Начало</label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Конец</label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    required
                  />
                </div>
                {lotTariff && startTime && endTime && (
                  <p style={{ marginBottom: 12, fontSize: '0.95rem' }}>
                    <CreditCard size={16} /> Стоимость ≈{' '}
                    <strong>
                      {(
                        ((new Date(endTime) - new Date(startTime)) / 3600000) *
                        lotTariff.pricePerHour
                      ).toFixed(2)}{' '}
                      MDL
                    </strong>
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Период абонемента</label>
                  <select value={subPeriod} onChange={e => setSubPeriod(e.target.value)}>
                    {Object.entries(subLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                {lotTariff && (
                  <p style={{ marginBottom: 12, fontSize: '0.95rem' }}>
                    <CreditCard size={16} /> Стоимость:{' '}
                    <strong>
                      {lotTariff[`subscription${subPeriod.charAt(0).toUpperCase() + subPeriod.slice(1)}`] || '—'} MDL
                    </strong>
                  </p>
                )}
              </>
            )}

            <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 12 }}>
              Ваш баланс: <strong>{user?.balance?.toFixed(2)} MDL</strong>
            </p>

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Оформление...' : 'Забронировать'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
