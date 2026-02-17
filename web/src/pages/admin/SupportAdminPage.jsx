// Поддержка (админ) — все тикеты, ответы пользователям
import { useState, useEffect, useRef } from 'react';
import { adminAPI, supportAPI } from '../../services/api';
import { MessageSquare, Send, CheckCircle } from 'lucide-react';

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all');
  const chatEnd = useRef(null);

  const load = async () => {
    try {
      const res = await supportAPI.getAllTickets();
      setTickets(res.data.tickets || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await supportAPI.addMessage(selected._id, replyText);
      setSelected(res.data.ticket);
      setReplyText('');
      setTickets((prev) => prev.map((t) => (t._id === selected._id ? res.data.ticket : t)));
    } catch { /* ignore */ }
    setSending(false);
    setTimeout(() => chatEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const handleClose = async (id) => {
    try {
      await supportAPI.closeTicket(id);
      setSelected(null);
      load();
    } catch { /* ignore */ }
  };

  const statusLabels = { open: 'Открыт', 'in-progress': 'В работе', closed: 'Закрыт' };
  const statusColors = { open: 'badge-green', 'in-progress': 'badge-yellow', closed: 'badge-red' };

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <h2><MessageSquare size={22} style={{ verticalAlign: 'middle' }} /> Обращения пользователей</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['all', 'open', 'in-progress', 'closed'].map((f) => (
          <button
            key={f}
            className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Все' : statusLabels[f]}
            {f !== 'all' && (
              <span style={{ marginLeft: 4 }}>({tickets.filter((t) => t.status === f).length})</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, minHeight: 500 }}>
        {/* Ticket list */}
        <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 20 }}>
              Нет обращений.
            </p>
          ) : (
            filtered.map((t) => (
              <div
                key={t._id}
                onClick={() => setSelected(t)}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--gray-200)',
                  cursor: 'pointer',
                  background: selected?._id === t._id ? 'var(--primary-light)' : 'transparent',
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{t.subject}</strong>
                  <span className={`badge ${statusColors[t.status]}`} style={{ fontSize: '0.7rem' }}>
                    {statusLabels[t.status]}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  👤 {t.user?.name || t.user?.email || 'Пользователь'} · {new Date(t.updatedAt || t.createdAt).toLocaleString('ru')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  {t.messages?.length || 0} сообщений
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          {selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selected.subject}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    👤 {selected.user?.name || selected.user?.email || 'Пользователь'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`badge ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
                  {selected.status !== 'closed' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleClose(selected._id)}>
                      <CheckCircle size={14} /> Закрыть
                    </button>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, maxHeight: 400, overflowY: 'auto', marginBottom: 12 }}>
                {selected.messages?.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      background: m.senderRole === 'admin' ? 'var(--primary-light)' : 'var(--gray-100)',
                      padding: '8px 12px',
                      borderRadius: 12,
                      marginBottom: 8,
                      maxWidth: '75%',
                      marginLeft: m.senderRole === 'admin' ? 'auto' : 0,
                      marginRight: m.senderRole === 'admin' ? 0 : 'auto',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 2 }}>
                      {m.senderRole === 'admin' ? '👨‍💼 Вы (Админ)' : '👤 Пользователь'} · {new Date(m.timestamp).toLocaleString('ru')}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{m.text}</div>
                  </div>
                ))}
                <div ref={chatEnd} />
              </div>

              {selected.status !== 'closed' && (
                <form onSubmit={handleReply} style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1 }}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Ответить пользователю..."
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    <Send size={16} />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--gray-500)' }}>
              Выберите обращение для просмотра
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
