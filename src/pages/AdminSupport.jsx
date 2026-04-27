import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../services/api';

const AdminSupport = () => {
  const [threads, setThreads] = useState([]);
  const [activeUserId, setActiveUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);

  const loadThreads = () => {
    setLoadingThreads(true);
    setError('');
    api.support
      .adminThreads()
      .then((data) => {
        setThreads(data);
        if (!activeUserId && data[0]?.userId) {
          setActiveUserId(data[0].userId);
        }
      })
      .catch((e) => setError(e.message || 'Failed to load support threads'))
      .finally(() => setLoadingThreads(false));
  };

  useEffect(() => {
    loadThreads();
    const id = setInterval(loadThreads, 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    const loadMessages = () => {
      const el = listRef.current;
      if (el) {
        const atBottom =
          el.scrollHeight - (el.scrollTop + el.clientHeight) < 40;
        stickToBottomRef.current = atBottom;
      }
      setLoadingMessages(true);
      setError('');
      api.support
        .adminThreadForUser(activeUserId)
        .then(setMessages)
        .catch((e) => setError(e.message || 'Failed to load messages'))
        .finally(() => setLoadingMessages(false));
    };
    loadMessages();
    const id = setInterval(loadMessages, 5000);
    return () => clearInterval(id);
  }, [activeUserId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const lawyersThreads = useMemo(
    () => threads.filter((t) => t.userRole === 'lawyer'),
    [threads],
  );

  const clientsThreads = useMemo(
    () => threads.filter((t) => t.userRole === 'client'),
    [threads],
  );

  const activeThread = useMemo(
    () => threads.find((t) => t.userId === activeUserId) || null,
    [threads, activeUserId],
  );

  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const senderLabel = (message) => {
    if (message.fromAdmin) return 'Admin';
    if (message.userRole === 'lawyer') return 'Lawyer';
    if (message.userRole === 'client') return 'Client';
    return 'User';
  };

  const onSend = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.body;
    const body = input.value?.trim();
    if (!body || !activeUserId) return;
    // Clear immediately so the admin sees the textbox reset
    input.value = '';
    setSending(true);
    setError('');
    try {
      await api.support.adminReplyToUser(activeUserId, body);
      // Refresh messages and thread list so both sides stay in sync
      api.support
        .adminThreadForUser(activeUserId)
        .then((data) => {
          setMessages(data);
        })
        .catch((err) => setError(err.message || 'Failed to load messages'));
      loadThreads();
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: '1rem' }}>
      <div className="card" style={{ padding: '1rem', height: 'calc(100vh - 8rem)', overflow: 'auto' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h2 style={{ fontSize: '1.125rem' }}>Support Threads</h2>
          <button type="button" className="btn btn-outline" onClick={loadThreads} disabled={loadingThreads}>
            Refresh
          </button>
        </div>
        {loadingThreads ? (
          <p className="text-secondary">Loading threads…</p>
        ) : threads.length === 0 ? (
          <p className="text-secondary">No users have contacted support yet.</p>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Lawyers</h3>
              {lawyersThreads.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>No lawyer threads.</p>
              ) : (
                <div className="flex-col" style={{ display: 'flex', gap: '0.5rem' }}>
                  {lawyersThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`btn ${t.userId === activeUserId ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ justifyContent: 'flex-start', padding: '0.6rem', width: '100%' }}
                      onClick={() => setActiveUserId(t.userId)}
                    >
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.25 }}>
                          {t.userName || t.userEmail || t.userId}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {t.userEmail || t.userId}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                          Last: {formatDateTime(t.lastMessageAt)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>Clients</h3>
              {clientsThreads.length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.8rem' }}>No client threads.</p>
              ) : (
                <div className="flex-col" style={{ display: 'flex', gap: '0.5rem' }}>
                  {clientsThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`btn ${t.userId === activeUserId ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ justifyContent: 'flex-start', padding: '0.6rem', width: '100%' }}
                      onClick={() => setActiveUserId(t.userId)}
                    >
                      <div style={{ textAlign: 'left', minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'normal', lineHeight: 1.25 }}>
                          {t.userName || t.userEmail || t.userId}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                          {t.userEmail || t.userId}
                        </div>
                        <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                          Last: {formatDateTime(t.lastMessageAt)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1rem', height: 'calc(100vh - 8rem)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.125rem' }}>Conversation</h2>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
            {activeThread
              ? `Support chat with ${activeThread.userName || activeThread.userEmail || activeThread.userId}`
              : 'Select a thread to view messages.'}
          </p>
        </div>

        {error && (
          <div style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>
            {error}
          </div>
        )}

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--bg-color)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          {loadingMessages ? (
            <p className="text-secondary">Loading messages…</p>
          ) : !activeUserId ? (
            <p className="text-secondary">Select a user thread from the left.</p>
          ) : messages.length === 0 ? (
            <p className="text-secondary">No messages yet for this user.</p>
          ) : (
            <div className="flex-col" style={{ display: 'flex', gap: '0.5rem' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    boxShadow: 'none',
                    alignSelf: m.fromAdmin ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <div style={{ fontSize: '0.75rem' }} className="text-secondary">
                    {senderLabel(m)} • {formatDateTime(m.createdAt)}
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
            placeholder={activeUserId ? 'Type your reply…' : 'Select a thread first'}
            disabled={sending || !activeUserId}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !activeUserId}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminSupport;

