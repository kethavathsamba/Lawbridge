import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LawyerConsultations = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatConsultId, setChatConsultId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [sending, setSending] = useState(false);
  const isMine = (m) => {
    const sid = String(m?.senderId || '');
    return sid === String(user?.id || '');
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    api.consultations
      .list()
      .then((data) => setConsultations(data || []))
      .catch((err) => setError(err.message || 'Failed to load consultations'))
      .finally(() => setLoading(false));
  }, []);

  const openChat = async (clientId) => {
    setChatError('');
    setChatConsultId(clientId);
    try {
      const conv = await api.messages.createConversation(clientId);
      setConversationId(conv.id);
      const msgs = await api.messages.thread(conv.id);
      setMessages(
        (msgs || []).map((m) => ({
          ...m,
          isMine: isMine(m),
        }))
      );
    } catch (err) {
      setChatError(err.message || 'Failed to load chat');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!conversationId) return;
    const form = e.currentTarget;
    const input = form.elements.body;
    const body = input.value?.trim();
    if (!body) return;
    input.value = '';
    setSending(true);
    setChatError('');
    try {
      await api.messages.send(conversationId, body);
      const msgs = await api.messages.thread(conversationId);
      setMessages(
        (msgs || []).map((m) => ({
          ...m,
          isMine: isMine(m),
        }))
      );
    } catch (err) {
      setChatError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1rem' }}>Consultations</h2>
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="text-secondary">Loading consultations...</p>
      ) : consultations.length === 0 ? (
        <p className="text-secondary">No consultations found.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {consultations.map((c) => (
            <li key={c.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
              <div style={{ fontWeight: 600 }}>{c.clientName || c.clientId}</div>
              <div style={{ fontSize: '0.95rem', color: '#555' }}>{c.consultType || 'Consultation'}</div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Date: {c.date || '—'} Time: {c.time || '—'}</div>
              <div style={{ fontSize: '0.9rem', color: '#888' }}>Status: {c.status || '—'}</div>
              {c.caseDescription && <div style={{ marginTop: '0.5rem', color: '#666' }}>{c.caseDescription}</div>}
              {c.lawyerNote && <div style={{ marginTop: '0.5rem', color: '#888' }}>Note: {c.lawyerNote}</div>}
              <button className="btn btn-outline" style={{ marginTop: '0.75rem' }} onClick={() => openChat(c.clientId)}>
                Chat with Client
              </button>
            </li>
          ))}
        </ul>
      )}
      {chatConsultId && (
        <div className="card" style={{ marginTop: '2rem', padding: '1rem' }}>
          <h3>Chat with Client</h3>
          {chatError && <div className="alert alert-error">{chatError}</div>}
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', background: '#f9f9f9', borderRadius: '8px', padding: '0.5rem' }}>
            {messages.length === 0 ? (
              <p className="text-secondary">No messages yet.</p>
            ) : (
              messages.map((m) => {
                const mine = isMine(m);
                return (
                  <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '0.5rem' }}>
                    <span
                      style={{
                        maxWidth: '70%',
                        backgroundColor: mine ? 'var(--primary)' : 'white',
                        color: mine ? 'white' : 'inherit',
                        border: mine ? 'none' : '1px solid var(--border-color)',
                        padding: '0.5rem',
                        borderRadius: '999px',
                        display: 'inline-block',
                      }}
                    >
                      {m.body}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem' }}>
            <input name="body" type="text" className="input" placeholder="Type a message..." autoComplete="off" style={{ flex: 1 }} />
            <button type="submit" className="btn btn-primary" disabled={sending}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default LawyerConsultations;
