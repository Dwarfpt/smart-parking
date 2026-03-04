// Поддержка — тикеты, сообщения, чат с админом
import { useState, useEffect, useRef } from 'react';
import { supportAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { MessageSquare, Send, Plus, X } from 'lucide-react';

export default function SupportPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const chatEnd = useRef(null);

  const load = async () => {
    try {
      const res = await supportAPI.getMyTickets();
      setTickets(res.data.tickets || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await supportAPI.createTicket({ subject: newSubject, message: newMessage });
      setShowNew(false);
      setNewSubject('');
      setNewMessage('');
      await load();
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      const res = await supportAPI.addMessage(selected._id, replyText);
      setSelected(res.data.ticket);
      setReplyText('');
      setTickets((prev) => prev.map((tk) => (tk._id === selected._id ? res.data.ticket : tk)));
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

  const statusLabels = { open: t('supportOpen'), 'in-progress': t('inProgress'), closed: t('supportClosed') };
  const statusColors = { open: 'badge-green', 'in-progress': 'badge-yellow', closed: 'badge-red' };

  if (loading) return <div className="loading"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2><MessageSquare size={22} style={{ verticalAlign: 'middle' }} /> {t('supportTitle')}</h2>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowNew(true); setSelected(null); }}>
          <Plus size={16} /> {t('supportNew')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, minHeight: 400 }}>
        {/* Ticket list */}
        <div className="card" style={{ maxHeight: 600, overflowY: 'auto' }}>
          {tickets.length === 0 ? (
            <p style={{ color: 'var(--gray-500)', textAlign: 'center', padding: 20 }}>
              {t('supportEmpty')}
            </p>
          ) : (
            tickets.map((tk) => (
              <div
                key={tk._id}
                onClick={() => { setSelected(tk); setShowNew(false); }}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--gray-200)',
                  cursor: 'pointer',
                  background: selected?._id === tk._id ? 'var(--primary-light)' : 'transparent',
                  borderRadius: 6,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{tk.subject}</strong>
                  <span className={`badge ${statusColors[tk.status]}`} style={{ fontSize: '0.7rem' }}>
                    {statusLabels[tk.status]}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 4 }}>
                  {new Date(tk.updatedAt || tk.createdAt).toLocaleString(lang)} · {tk.messages?.length || 0} {t('supportMessages')}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat / New form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          {showNew ? (
            <>
              <h3>{t('supportNew')}</h3>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>{t('supportSubject')}</label>
                  <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} required placeholder={t('supportProblemWith')} />
                </div>
                <div className="form-group">
                  <label>{t('supportMessage')}</label>
                  <textarea
                    rows={4}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                    placeholder={t('supportDescribe')}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary" disabled={sending}>
                    {sending ? t('supportSending') : t('supportSend')}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowNew(false)}>
                    {t('cancel')}
                  </button>
                </div>
              </form>
            </>
          ) : selected ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{selected.subject}</h3>
                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge ${statusColors[selected.status]}`}>{statusLabels[selected.status]}</span>
                  {selected.status !== 'closed' && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleClose(selected._id)}>
                      <X size={14} /> {t('supportClose')}
                    </button>
                  )}
                </div>
              </div>

              <div className="chat-messages" style={{ flex: 1, maxHeight: 400, overflowY: 'auto', marginBottom: 12 }}>
                {selected.messages?.map((m, i) => (
                  <div
                    key={i}
                    className={`chat-message ${m.senderRole === 'admin' ? 'admin' : 'user'}`}
                    style={{
                      alignSelf: m.senderRole === 'admin' ? 'flex-start' : 'flex-end',
                      background: m.senderRole === 'admin' ? 'var(--gray-100)' : 'var(--primary-light)',
                      padding: '8px 12px',
                      borderRadius: 12,
                      marginBottom: 8,
                      maxWidth: '75%',
                      marginLeft: m.senderRole === 'admin' ? 0 : 'auto',
                      marginRight: m.senderRole === 'admin' ? 'auto' : 0,
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 2 }}>
                      {m.senderRole === 'admin' ? `👨‍💼 ${t('supportBot')}` : `👤 ${t('supportYou')}`} · {new Date(m.timestamp).toLocaleString(lang)}
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
                    placeholder={t('supportEnterMessage')}
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
              {t('supportSelectOrCreate')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
