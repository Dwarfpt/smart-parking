// Управление тарифами — CRUD, абонементы, пиковые часы
import { useState, useEffect } from 'react';
import { tariffAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Tag, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const emptyForm = {
  name: '', pricePerHour: '', peakPricePerHour: '',
  peakHoursStart: '08:00', peakHoursEnd: '18:00',
  subscriptionWeek: '', subscriptionMonth: '', subscription3Months: '', subscriptionYear: '',
};

export default function TariffsAdminPage() {
  const { t } = useLanguage();
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await tariffAPI.getAll();
      setTariffs(res.data.tariffs || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3000); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      pricePerHour: Number(form.pricePerHour),
      peakPricePerHour: Number(form.peakPricePerHour) || undefined,
      peakHoursStart: form.peakHoursStart || undefined,
      peakHoursEnd: form.peakHoursEnd || undefined,
      subscriptionWeek: Number(form.subscriptionWeek) || undefined,
      subscriptionMonth: Number(form.subscriptionMonth) || undefined,
      subscription3Months: Number(form.subscription3Months) || undefined,
      subscriptionYear: Number(form.subscriptionYear) || undefined,
    };

    try {
      if (editing) {
        await tariffAPI.update(editing, data);
        flash(setMsg, t('tariffUpdated'));
      } else {
        await tariffAPI.create(data);
        flash(setMsg, t('tariffCreated'));
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handleEdit = (tf) => {
    setEditing(tf._id);
    setForm({
      name: tf.name,
      pricePerHour: tf.pricePerHour || '',
      peakPricePerHour: tf.peakPricePerHour || '',
      peakHoursStart: tf.peakHoursStart || '08:00',
      peakHoursEnd: tf.peakHoursEnd || '18:00',
      subscriptionWeek: tf.subscriptionWeek || '',
      subscriptionMonth: tf.subscriptionMonth || '',
      subscription3Months: tf.subscription3Months || '',
      subscriptionYear: tf.subscriptionYear || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`${t('deleteTariffConfirm')} "${name}"?`)) return;
    try {
      await tariffAPI.delete(id);
      flash(setMsg, t('tariffDeleted'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2><Tag size={22} style={{ verticalAlign: 'middle' }} /> {t('adminTariffs')}</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ ...emptyForm }); }}
        >
          {showForm ? <><X size={16} /> {t('close')}</> : <><Plus size={16} /> {t('newTariff')}</>}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ maxWidth: 600, marginBottom: 20 }}>
          <h3>{editing ? t('editTariff') : t('newTariff')}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{t('tariffName')}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Стандарт" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>{t('tariffPricePerHour')}</label>
                <input type="number" step="0.01" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>{t('tariffPeakPrice')}</label>
                <input type="number" step="0.01" value={form.peakPricePerHour} onChange={(e) => setForm({ ...form, peakPricePerHour: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('tariffPeakFrom')}</label>
                <input type="time" value={form.peakHoursStart} onChange={(e) => setForm({ ...form, peakHoursStart: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('tariffPeakTo')}</label>
                <input type="time" value={form.peakHoursEnd} onChange={(e) => setForm({ ...form, peakHoursEnd: e.target.value })} />
              </div>
            </div>

            <h4 style={{ marginTop: 12, marginBottom: 8 }}>{t('tariffSubscriptions')}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>{t('tariffWeekLabel')}</label>
                <input type="number" value={form.subscriptionWeek} onChange={(e) => setForm({ ...form, subscriptionWeek: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('tariffMonthLabel')}</label>
                <input type="number" value={form.subscriptionMonth} onChange={(e) => setForm({ ...form, subscriptionMonth: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('tariff3MonthsLabel')}</label>
                <input type="number" value={form.subscription3Months} onChange={(e) => setForm({ ...form, subscription3Months: e.target.value })} />
              </div>
              <div className="form-group">
                <label>{t('tariffYearLabel')}</label>
                <input type="number" value={form.subscriptionYear} onChange={(e) => setForm({ ...form, subscriptionYear: e.target.value })} />
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('tariffName')}</th>
              <th>{t('pricePerHourHeader')}</th>
              <th>{t('peakPriceHeader')}</th>
              <th>{t('peakHoursHeader')}</th>
              <th>{t('subWeekHeader')}</th>
              <th>{t('subMonthHeader')}</th>
              <th>{t('sub3MonthsHeader')}</th>
              <th>{t('subYearHeader')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map((tf) => (
              <tr key={tf._id}>
                <td><strong>{tf.name}</strong></td>
                <td>{tf.pricePerHour} MDL</td>
                <td>{tf.peakPricePerHour ? `${tf.peakPricePerHour} MDL` : '—'}</td>
                <td>{tf.peakHoursStart && tf.peakHoursEnd ? `${tf.peakHoursStart}–${tf.peakHoursEnd}` : '—'}</td>
                <td>{tf.subscriptionWeek || '—'}</td>
                <td>{tf.subscriptionMonth || '—'}</td>
                <td>{tf.subscription3Months || '—'}</td>
                <td>{tf.subscriptionYear || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(tf)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(tf._id, tf.name)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>{t('noTariffs')}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
