// Управление пользователями — поиск, редактирование, деактивация
import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import { Users, Search, Edit2, Trash2, DollarSign, X, Check, ShieldCheck, ShieldOff, MailCheck, MailX } from 'lucide-react';

export default function UsersAdminPage() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', role: 'user' });
  const [creditModal, setCreditModal] = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data.users || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const flash = (setter, text) => { setter(text); setTimeout(() => setter(''), 3000); };

  const handleEdit = (u) => {
    setEditing(u._id);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '', role: u.role });
  };

  const handleSave = async () => {
    try {
      await adminAPI.updateUser(editing, editForm);
      setEditing(null);
      flash(setMsg, t('userUpdated'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`${t('deleteUserConfirm')} ${name}?`)) return;
    try {
      await adminAPI.deleteUser(id);
      flash(setMsg, t('userDeleted'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const handleCredit = async () => {
    if (!creditAmount || Number(creditAmount) <= 0) return;
    try {
      await adminAPI.creditUser(creditModal._id, Number(creditAmount));
      setCreditModal(null);
      setCreditAmount('');
      flash(setMsg, `${t('balanceCredited')} ${creditAmount} MDL`);
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const toggleEmailVerified = async (u) => {
    try {
      await adminAPI.updateUser(u._id, { isEmailVerified: !u.isEmailVerified });
      flash(setMsg, t('userUpdated'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const toggle2FA = async (u) => {
    try {
      await adminAPI.updateUser(u._id, { twoFactorEnabled: !u.twoFactorEnabled });
      flash(setMsg, t('userUpdated'));
      load();
    } catch (err) {
      flash(setError, err.response?.data?.message || t('error'));
    }
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h2><Users size={22} style={{ verticalAlign: 'middle' }} /> {t('adminUsers')}</h2>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
        <Search size={18} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--gray-400)' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchUserPlaceholder')}
          style={{ paddingLeft: 36, width: '100%' }}
        />
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{t('authName')}</th>
              <th>Email</th>
              <th>{t('authPhone')}</th>
              <th>{t('role')}</th>
              <th>{t('emailVerified')}</th>
              <th>2FA</th>
              <th>{t('balance')}</th>
              <th>{t('registration')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u._id}>
                {editing === u._id ? (
                  <>
                    <td><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></td>
                    <td><input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></td>
                    <td><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></td>
                    <td>
                      <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                        <option value="user">{t('userRoleBadge')}</option>
                        <option value="admin">{t('adminRoleBadge')}</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.isEmailVerified ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => toggleEmailVerified(u)}
                        title={u.isEmailVerified ? t('off') : t('on')}
                        style={{ padding: '4px 8px' }}
                      >
                        {u.isEmailVerified ? <MailCheck size={14} /> : <MailX size={14} />}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.twoFactorEnabled ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggle2FA(u)}
                        title={u.twoFactorEnabled ? t('off') : t('on')}
                        style={{ padding: '4px 8px' }}
                      >
                        {u.twoFactorEnabled ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                      </button>
                    </td>
                    <td>{u.balance?.toFixed(2)} MDL</td>
                    <td>{new Date(u.createdAt).toLocaleDateString(lang)}</td>
                    <td>
                      <button className="btn btn-primary btn-sm" onClick={handleSave} style={{ marginRight: 4 }}>
                        <Check size={14} />
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>
                        <X size={14} />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-red' : 'badge-green'}`}>
                        {u.role === 'admin' ? t('adminRoleBadge') : t('userRoleBadge')}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.isEmailVerified ? 'btn-success' : 'btn-danger'}`}
                        onClick={() => toggleEmailVerified(u)}
                        title={u.isEmailVerified ? t('off') : t('on')}
                        style={{ padding: '4px 8px' }}
                      >
                        {u.isEmailVerified ? <MailCheck size={14} /> : <MailX size={14} />}
                      </button>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.twoFactorEnabled ? 'btn-success' : 'btn-secondary'}`}
                        onClick={() => toggle2FA(u)}
                        title={u.twoFactorEnabled ? t('off') : t('on')}
                        style={{ padding: '4px 8px' }}
                      >
                        {u.twoFactorEnabled ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                      </button>
                    </td>
                    <td>{u.balance?.toFixed(2)} MDL</td>
                    <td>{new Date(u.createdAt).toLocaleDateString(lang)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(u)} title={t('edit')}>
                          <Edit2 size={14} />
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => setCreditModal(u)} title={t('topupBtn')}>
                          <DollarSign size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id, u.name)} title={t('delete')}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit modal */}
      {creditModal && (
        <div className="modal-overlay" onClick={() => setCreditModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t('creditBalance')} — {creditModal.name}</h3>
            <p style={{ margin: '8px 0', color: 'var(--gray-500)' }}>
              {t('currentBalance')}: {creditModal.balance?.toFixed(2)} MDL
            </p>
            <div className="form-group">
              <label>{t('topupAmount')}</label>
              <input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCredit}>{t('topupBtn')}</button>
              <button className="btn btn-secondary" onClick={() => setCreditModal(null)}>{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: '0.85rem' }}>
        {filtered.length} {t('totalOf')} {users.length}
      </p>
    </div>
  );
}
