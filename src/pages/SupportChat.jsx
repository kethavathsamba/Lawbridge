import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const SupportChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const load = () => {
    const el = listRef.current;
    if (el) {
      const atBottom =
        el.scrollHeight - (el.scrollTop + el.clientHeight) < 40;
      stickToBottomRef.current = atBottom;
    }
    setLoading(true);
    setError('');
    api.support
      .thread()
      .then(setMessages)
      .catch((e) => setError(e.message || 'Failed to load support thread'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onSend = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.body;
    const body = input.value?.trim();
    if (!body) return;
    // Clear immediately so the user sees the textbox reset
    input.value = '';
    setSending(true);
    setError('');
    try {
      await api.support.send(body);
      // Reload from server to ensure we see the canonical message list
      load();
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1rem', height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Chat with Admin</h1>
        <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
          Send a message to the LawBridge admin team for help with your account, cases, or billing.
        </p>
      </div>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>
          {error}
        </div>
      )}

      <div
        ref={listRef}
        style={{ flex: 1, overflow: 'auto', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '0.75rem' }}
      >
        {loading ? (
          <p className="text-secondary">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-secondary">No messages yet. Start the conversation below.</p>
        ) : (
          <div className="flex-col" style={{ display: 'flex', gap: '0.5rem' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                className="card"
                style={{
                  boxShadow: 'none',
                  alignSelf: m.fromAdmin ? 'flex-start' : 'flex-end',
                  maxWidth: '80%',
                }}
              >
                <div style={{ fontSize: '0.75rem' }} className="text-secondary">
                  {m.fromAdmin ? 'Admin' : 'You'} • {m.createdAt || '—'}
                </div>
                <div style={{ marginTop: '0.25rem' }}>{m.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSend} style={{ display: 'flex', gap: '0.5rem' }}>
        <input
          name="body"
          className="form-input"
          placeholder="Type your message…"
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default SupportChat;

