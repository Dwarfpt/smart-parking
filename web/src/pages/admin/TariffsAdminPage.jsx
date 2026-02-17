// Управление тарифами — CRUD, абонементы, пиковые часы
import { useState, useEffect } from 'react';
import { tariffAPI } from '../../services/api';
import { Tag, Plus, Edit2, Trash2, Check, X } from 'lucide-react';

const emptyForm = {
  name: '', pricePerHour: '', peakPricePerHour: '',
  peakHoursStart: '08:00', peakHoursEnd: '18:00',
  subscriptionWeek: '', subscriptionMonth: '', subscription3Months: '', subscriptionYear: '',
};

export default function TariffsAdminPage() {
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
        flash(setMsg, 'Тариф обновлён');
      } else {
        await tariffAPI.create(data);
        flash(setMsg, 'Тариф создан');
      }
      setShowForm(false);
      setEditing(null);
      setForm({ ...emptyForm });
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка');
    }
  };

  const handleEdit = (t) => {
    setEditing(t._id);
    setForm({
      name: t.name,
      pricePerHour: t.pricePerHour || '',
      peakPricePerHour: t.peakPricePerHour || '',
      peakHoursStart: t.peakHoursStart || '08:00',
      peakHoursEnd: t.peakHoursEnd || '18:00',
      subscriptionWeek: t.subscriptionWeek || '',
      subscriptionMonth: t.subscriptionMonth || '',
      subscription3Months: t.subscription3Months || '',
      subscriptionYear: t.subscriptionYear || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Удалить тариф "${name}"?`)) return;
    try {
      await tariffAPI.delete(id);
      flash(setMsg, 'Тариф удалён');
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || 'Ошибка');
    }
  };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2><Tag size={22} style={{ verticalAlign: 'middle' }} /> Тарифы</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ ...emptyForm }); }}
        >
          {showForm ? <><X size={16} /> Закрыть</> : <><Plus size={16} /> Новый тариф</>}
        </button>
      </div>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {showForm && (
        <div className="card" style={{ maxWidth: 600, marginBottom: 20 }}>
          <h3>{editing ? 'Редактировать тариф' : 'Новый тариф'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Название</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Стандарт" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Цена/час (MDL)</label>
                <input type="number" step="0.01" value={form.pricePerHour} onChange={(e) => setForm({ ...form, pricePerHour: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Пиковая цена/час</label>
                <input type="number" step="0.01" value={form.peakPricePerHour} onChange={(e) => setForm({ ...form, peakPricePerHour: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Пик с</label>
                <input type="time" value={form.peakHoursStart} onChange={(e) => setForm({ ...form, peakHoursStart: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Пик до</label>
                <input type="time" value={form.peakHoursEnd} onChange={(e) => setForm({ ...form, peakHoursEnd: e.target.value })} />
              </div>
            </div>

            <h4 style={{ marginTop: 12, marginBottom: 8 }}>Абонементы (MDL)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label>Неделя</label>
                <input type="number" value={form.subscriptionWeek} onChange={(e) => setForm({ ...form, subscriptionWeek: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Месяц</label>
                <input type="number" value={form.subscriptionMonth} onChange={(e) => setForm({ ...form, subscriptionMonth: e.target.value })} />
              </div>
              <div className="form-group">
                <label>3 месяца</label>
                <input type="number" value={form.subscription3Months} onChange={(e) => setForm({ ...form, subscription3Months: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Год</label>
                <input type="number" value={form.subscriptionYear} onChange={(e) => setForm({ ...form, subscriptionYear: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn btn-primary">
                <Check size={16} /> {editing ? 'Сохранить' : 'Создать'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditing(null); }}>
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Название</th>
              <th>Цена/час</th>
              <th>Пиковая</th>
              <th>Пик часы</th>
              <th>Абон. нед.</th>
              <th>Абон. мес.</th>
              <th>Абон. 3 мес.</th>
              <th>Абон. год</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map((t) => (
              <tr key={t._id}>
                <td><strong>{t.name}</strong></td>
                <td>{t.pricePerHour} MDL</td>
                <td>{t.peakPricePerHour ? `${t.peakPricePerHour} MDL` : '—'}</td>
                <td>{t.peakHoursStart && t.peakHoursEnd ? `${t.peakHoursStart}–${t.peakHoursEnd}` : '—'}</td>
                <td>{t.subscriptionWeek || '—'}</td>
                <td>{t.subscriptionMonth || '—'}</td>
                <td>{t.subscription3Months || '—'}</td>
                <td>{t.subscriptionYear || '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(t)}>
                      <Edit2 size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t._id, t.name)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr><td colSpan="9" style={{ textAlign: 'center', color: 'var(--gray-500)' }}>Нет тарифов</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
