// Управление парковками — создание, редактирование, деактивация
import { useState, useEffect } from 'react';
import { adminAPI, tariffAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { MapPin, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const emptyForm = {
  name: '', address: '', latitude: '47.0245', longitude: '28.8297',
  totalSpots: '', tariff: '', workingHoursOpen: '00:00', workingHoursClose: '23:59',
};

export default function ParkingsAdminPage() {
  const { t, loc } = useLanguage();
  const [lots, setLots] = useState([]);
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [lotsRes, tariffsRes] = await Promise.all([
        adminAPI.getParkings ? adminAPI.getParkings() : adminAPI.getBookings(), // fallback
        tariffAPI.getAll(),
      ]);
      // getParkings may not exist, use parking API
      setTariffs(tariffsRes.data.tariffs || []);
    } catch { /* ignore */ }

    // Load lots via parking API
    try {
      const { parkingAPI } = await import('../../services/api');
      const res = await parkingAPI.getAll();
      setLots(res.data.parkingLots || []);
    } catch { /* ignore */ }

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      address: form.address,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      totalSpots: Number(form.totalSpots),
      tariff: form.tariff || undefined,
      workingHours: {
        open: form.workingHoursOpen,
        close: form.workingHoursClose,
      },
    };

    try {
      if (editing) {
        await adminAPI.updateParking(editing, data);
        flash(setMsg, t('parkingUpdated'));
      } else {
        await adminAPI.createParking(data);
        flash(setMsg, t('parkingCreated'));
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handleEdit = (lot) => {
    setEditing(lot._id);
    setForm({
      name: lot.name,
      address: lot.address,
      latitude: lot.location?.coordinates?.[1] || '47.0245',
      longitude: lot.location?.coordinates?.[0] || '28.8297',
      totalSpots: lot.totalSpots || '',
      tariff: lot.tariff?._id || lot.tariff || '',
      workingHoursOpen: lot.workingHours?.open || '00:00',
      workingHoursClose: lot.workingHours?.close || '23:59',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`${t('deleteParkingConfirm')} "${name}"?`)) return;
    try {
      await adminAPI.deleteParking(id);
      flash(setMsg, t('parkingDeleted'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2><MapPin size={22} style={{ verticalAlign: 'middle' }} /> {t('adminParkings')}</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ ...emptyForm }); }}
        >
          {showForm ? <><X size={16} /> {t('close')}</> : <><Plus size={16} /> {t('newParking')}</>}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ maxWidth: 600, marginBottom: 20 }}>
          <h3>{editing ? t('editParking') : t('newParking')}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('parkingName')}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder={t('parkingNamePlaceholder')} />
            </div>
            <div className="form-group">
              <label>{t('parkingAddress')}</label>
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required placeholder={t('parkingAddressPlaceholder')} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>{t('parkingLat')}</label>
                <input type="number" step="0.0001" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('parkingLng')}</label>
                <input type="number" step="0.0001" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('parkingSpotsCount')}</label>
                <input type="number" min="1" value={form.totalSpots} onChange={(e) => setForm({ ...form, totalSpots: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('parkingTariff')}</label>
                <select value={form.tariff} onChange={(e) => setForm({ ...form, tariff: e.target.value })}>
                  <option value="">{t('selectTariff')}</option>
                  {tariffs.map((tf) => (
                    <option key={tf._id} value={tf._id}>{tf.name} ({tf.pricePerHour} MDL{t('perHour')})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>{t('parkingOpenTime')}</label>
                <input type="time" value={form.workingHoursOpen} onChange={(e) => setForm({ ...form, workingHoursOpen: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('parkingCloseTime')}</label>
                <input type="time" value={form.workingHoursClose} onChange={(e) => setForm({ ...form, workingHoursClose: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">
                <Check size={16} /> {editing ? t('save') : t('create')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {lots.map((lot) => (
          <div key={lot._id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <h3>{loc(lot, 'name')}</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(lot)}>
                  <Edit2 size={14} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(lot._id, loc(lot, 'name'))}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem', margin: '4px 0' }}>{loc(lot, 'address')}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-blue">{lot.totalSpots} {t('spotsCount')}</span>
              <span className="badge badge-green">{lot.freeSpots || 0} {t('freeCount')}</span>
              {lot.tariff && <span className="badge badge-yellow">{loc(lot.tariff, 'name') || lot.tariff.pricePerHour + ' MDL' + t('perHour')}</span>}
              <span className="badge badge-purple" style={{ background: '#8b5cf6', color: '#fff' }}>
                {lot.workingHours?.open} – {lot.workingHours?.close}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 8 }}>
              📍 {lot.location?.coordinates?.[1]?.toFixed(4)}, {lot.location?.coordinates?.[0]?.toFixed(4)}
            </p>
          </div>
        ))}
        {lots.length === 0 && (
          <p style={{ color: 'var(--gray-500)' }}>{t('noParkingsYet')}</p>
        )}
      </div>
    </div>
  );
}
