import React, { useEffect, useRef, useState } from 'react';
import { Clock, MessageSquare } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const LawyerCases = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [chatCaseId, setChatCaseId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewingId, setReviewingId] = useState('');
  const [savingMoneyId, setSavingMoneyId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [closingCaseId, setClosingCaseId] = useState('');
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const isMine = (m) => {
    const sid = String(m?.senderId || '');
    return sid === String(user?.id || '') || sid === String(activeCase?.lawyerId || '');
  };

  const loadCases = () => {
    setLoading(true);
    setError('');
    api.cases
      .list()
      .then((data) => {
        const items = data || [];
        setCases(items);
        if (!activeCaseId && items.length) setActiveCaseId(items[0].id);
      })
      .catch((err) => setError(err.message || 'Failed to load cases'))
      .finally(() => setLoading(false));
  };

  const refreshCasesSilently = () => {
    api.cases
      .list()
      .then((data) => {
        const items = data || [];
        setCases(items);
        if (!items.some((c) => c.id === activeCaseId)) {
          setActiveCaseId(items[0]?.id || null);
          setChatCaseId(null);
          setConversationId(null);
          setMessages([]);
          setChatError('');
        }
      })
      .catch(() => {
        // ignore silent refresh errors
      });
  };

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    const id = setInterval(refreshCasesSilently, 3000);
    return () => clearInterval(id);
  }, [activeCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = cases.find((x) => x.id === activeCaseId);
    if (!c) return;
    if (c.requestStatus === 'approved') {
      openChat(c);
    } else {
      setConversationId(null);
      setMessages([]);
      setChatError('Chat will be enabled after approval.');
    }
  }, [activeCaseId, cases]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversationId) return;
    const id = setInterval(async () => {
      try {
        const msgs = await api.messages.thread(conversationId);
        setMessages(
          (msgs || []).map((m) => ({
            ...m,
            isMine: isMine(m),
          }))
        );
      } catch {
        // ignore polling errors; next cycle will retry
      }
    }, 3000);
    return () => clearInterval(id);
  }, [conversationId, user?.id]);

  const openChat = async (theCase) => {
    if (theCase?.requestStatus !== 'approved') {
      setChatError('Chat is enabled only after you approve this case request.');
      return;
    }
    setChatError('');
    setChatCaseId(theCase.id);
    try {
      const conv = await api.messages.conversationForCase(theCase.id);
      setConversationId(conv.id);
      const msgs = await api.messages.thread(conv.id);
      setMessages(
        (msgs || []).map((m) => ({
          ...m,
          isMine: isMine(m),
        }))
      );
      if (String(theCase?.status || '').toLowerCase() === 'closed') {
        setChatError('Case is closed. Showing previous chat in read-only mode.');
      }
    } catch (err) {
      setChatError(err.message || 'Failed to load chat');
    }
  };

  const decideCase = async (caseId, approve) => {
    setReviewingId(caseId);
    setError('');
    setSuccess('');
    try {
      await api.cases.decide(caseId, approve);
      if (!approve) {
        setCases((prev) => prev.filter((x) => x.id !== caseId));
        setActiveCaseId((prev) => {
          if (prev !== caseId) return prev;
          const remain = cases.filter((x) => x.id !== caseId);
          return remain[0]?.id || null;
        });
        setChatCaseId((prev) => (prev === caseId ? null : prev));
        setConversationId((prev) => (chatCaseId === caseId ? null : prev));
        setMessages((prev) => (chatCaseId === caseId ? [] : prev));
        setSuccess('Case request rejected and removed.');
      } else {
        setSuccess('Case request approved.');
      }
      loadCases();
    } catch (err) {
      setError(err.message || 'Failed to review case request');
    } finally {
      setReviewingId('');
    }
  };

  const addPayment = async (c) => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid payment amount');
      return;
    }
    if (!paymentNote.trim()) {
      setError('Progress note is required');
      return;
    }
    setSavingMoneyId(c.id);
    setError('');
    try {
      await api.cases.addPayment(c.id, amount, paymentNote || undefined);
      setPaymentAmount('');
      setPaymentNote('');
      loadCases();
    } catch (err) {
      setError(err.message || 'Failed to add payment');
    } finally {
      setSavingMoneyId('');
    }
  };

  const requestCloseCase = async (c) => {
    setClosingCaseId(c.id);
    setError('');
    setSuccess('');
    try {
      await api.cases.requestClose(c.id);
      setSuccess('Close case request sent to client for approval.');
      loadCases();
    } catch (err) {
      setError(err.message || 'Failed to request case closure');
    } finally {
      setClosingCaseId('');
    }
  };

  const decideCloseCase = async (c, approve) => {
    setClosingCaseId(c.id);
    setError('');
    setSuccess('');
    try {
      await api.cases.decideClose(c.id, approve);
      setSuccess(approve ? 'Case closed and remaining amount transferred.' : 'Close case request rejected.');
      loadCases();
    } catch (err) {
      setError(err.message || 'Failed to review close case request');
    } finally {
      setClosingCaseId('');
    }
  };

  const statusLabel = (c) => c?.status || 'Pending Approval';
  const statusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('reject')) return 'badge-gray';
    if (s.includes('closed')) return 'badge-red';
    if (s.includes('pending')) return 'badge-blue';
    return 'badge-green';
  };
  const inr = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const activeCase = cases.find((c) => c.id === activeCaseId) || null;

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

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 56;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceToBottom < threshold;
  };

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="grid" style={{ gridTemplateColumns: '250px 1.5fr', gap: '1rem' }}>
      <div className="card" style={{ padding: '1rem', height: 'calc(100vh - 7rem)', overflow: 'auto' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>My Cases</h2>
        <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Review case requests, approve/reject, and manage payments.
        </p>
        {error && <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}
        {success && <div className="alert alert-success" style={{ marginBottom: '0.75rem' }}>{success}</div>}
        {loading ? (
          <p className="text-secondary">Loading cases...</p>
        ) : cases.length === 0 ? (
          <p className="text-secondary">No cases found.</p>
        ) : (
          <div className="flex-col" style={{ display: 'flex', gap: '0.5rem' }}>
            {cases.map((c) => (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                className="card"
                onClick={() => setActiveCaseId(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActiveCaseId(c.id);
                }}
                style={{
                  boxShadow: 'none',
                  cursor: 'pointer',
                  border: c.id === activeCaseId ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  background: c.id === activeCaseId ? 'rgba(30,58,138,0.06)' : 'white',
                  padding: '0.65rem 0.75rem',
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                  {c.title || 'Untitled Case'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${statusBadgeClass(statusLabel(c))}`}>{statusLabel(c)}</span>
                  <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                    {c.clientName || c.clientId}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1rem', minHeight: 'calc(100vh - 7rem)', maxHeight: 'calc(100vh - 7rem)', overflowY: 'auto' }}>
        {!activeCase ? (
          <p className="text-secondary">Select a case to view details.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 0 }}>{activeCase.title}</h3>
              {activeCase.requestStatus === 'approved' && String(activeCase.status || '').toLowerCase() !== 'closed' && (
                <>
                  {activeCase.closeRequest?.status === 'pending' && activeCase.closeRequest?.requestedByRole === 'client' ? (
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={closingCaseId === activeCase.id}
                        onClick={() => decideCloseCase(activeCase, true)}
                      >
                        Approve Close
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        disabled={closingCaseId === activeCase.id}
                        onClick={() => decideCloseCase(activeCase, false)}
                      >
                        Reject Close
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      disabled={closingCaseId === activeCase.id || activeCase.closeRequest?.status === 'pending'}
                      onClick={() => requestCloseCase(activeCase)}
                    >
                      {activeCase.closeRequest?.status === 'pending' ? 'Close Request Pending' : 'Close Case'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Status: <span className={`badge ${statusBadgeClass(statusLabel(activeCase))}`}>{statusLabel(activeCase)}</span>
              {activeCase.closeRequest?.status === 'pending' && (
                <> • Close request pending ({activeCase.closeRequest.requestedByRole})</>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '0.75rem', marginTop: '0.6rem', alignItems: 'start' }}>
              <div className="card" style={{ boxShadow: 'none', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Client and case details</div>
                <div className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
                  <div><strong>Client:</strong> {activeCase.clientName || activeCase.clientId || '—'}</div>
                  <div><strong>Client Email:</strong> {activeCase.clientEmail || '—'}</div>
                  <div><strong>Client Phone:</strong> {activeCase.clientPhone || '—'}</div>
                  <div><strong>Client Offer:</strong> {inr(activeCase.offeredAmount)}</div>
                  <div><strong>Court:</strong> {activeCase.courtName || '—'}</div>
                  <div><strong>Case Type:</strong> {activeCase.caseType || '—'}</div>
                  <div><strong>Filed on:</strong> {activeCase.filingDate || '—'}</div>
                </div>
                {activeCase.requestStatus === 'pending' && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={reviewingId === activeCase.id}
                      onClick={() => decideCase(activeCase.id, true)}
                    >
                      {reviewingId === activeCase.id ? 'Please wait…' : 'Approve Request'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      disabled={reviewingId === activeCase.id}
                      onClick={() => decideCase(activeCase.id, false)}
                    >
                      Reject Request
                    </button>
                  </div>
                )}
              </div>

              <div className="card" style={{ boxShadow: 'none', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment summary</div>
                <div className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                  <div><strong>Amount Charged:</strong> {inr(activeCase.amountCharged)}</div>
                  <div><strong>Amount Paid:</strong> {inr(activeCase.amountPaid)}</div>
                  <div><strong>Balance:</strong> {inr(Math.max(0, Number(activeCase.amountCharged || 0) - Number(activeCase.amountPaid || 0)))}</div>
                </div>
                {activeCase.requestStatus === 'approved' && String(activeCase.status || '').toLowerCase() !== 'closed' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem', marginTop: '0.5rem' }}>
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.25rem', paddingTop: '0.5rem' }}>
                      <label className="form-label">Request installment (client approval required)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        placeholder="Installment amount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                      />
                      <input
                        className="form-input"
                        placeholder="Progress note (required)"
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        style={{ marginTop: '0.4rem' }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ width: '100%', marginTop: '0.4rem' }}
                        disabled={savingMoneyId === activeCase.id}
                        onClick={() => addPayment(activeCase)}
                      >
                        Send installment request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ boxShadow: 'none', marginTop: '0.75rem', padding: '0.75rem', maxHeight: '140px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment history</div>
              {(activeCase.paymentHistory || []).length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No installments added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(activeCase.paymentHistory || []).slice().reverse().map((p, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.55rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{inr(p.amount)}</div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{p.note || 'No note'}</div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{p.createdAt || '—'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ boxShadow: 'none', marginTop: '0.75rem', padding: '0.75rem', maxHeight: '160px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Installment requests</div>
              {(activeCase.installmentRequests || []).filter((r) => r.status !== 'approved').length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No installment requests yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {(activeCase.installmentRequests || [])
                    .filter((r) => r.status !== 'approved')
                    .slice()
                    .reverse()
                    .map((r) => (
                    <div key={r.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.45rem 0.55rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.85rem' }}>{inr(r.amount)}</strong>
                        <span className={`badge ${r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-gray' : 'badge-blue'}`}>{r.status}</span>
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{r.progressNote || 'No progress note'}</div>
                    </div>
                    ))}
                </div>
              )}
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
              <div
                style={{
                  padding: '0.6rem 0.9rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MessageSquare size={16} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    Chat with {activeCase.clientName || 'Client'}
                  </span>
                </div>
                <div className="text-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> Messages related to this case
                </div>
              </div>
              <div
                ref={listRef}
                onScroll={onScroll}
                style={{ flex: 1, minHeight: '140px', maxHeight: '220px', overflowY: 'auto', padding: '0.75rem 0.9rem', backgroundColor: 'var(--bg-color)' }}
              >
                {chatError && <div className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{chatError}</div>}
                {messages.length === 0 && !chatError && (
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    {String(activeCase.status || '').toLowerCase() === 'closed'
                      ? 'This case is closed. Chat is disabled.'
                      : activeCase.requestStatus === 'approved'
                      ? 'Start a conversation with your client about this case.'
                      : 'Chat will be enabled once you approve this case request.'}
                  </p>
                )}
                {messages.map((m) => {
                  const mine = isMine(m);
                  return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      justifyContent: mine ? 'flex-end' : 'flex-start',
                      marginBottom: '0.35rem',
                    }}
                  >
                    <span
                      style={{
                        maxWidth: '70%',
                        backgroundColor: mine ? 'var(--primary)' : 'white',
                        color: mine ? 'white' : 'inherit',
                        border: mine ? 'none' : '1px solid var(--border-color)',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '999px',
                        display: 'inline-block',
                        fontSize: '0.85rem',
                      }}
                    >
                      {m.body}
                    </span>
                  </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <input
                  name="body"
                  type="text"
                  className="form-input"
                  placeholder="Type a message..."
                  autoComplete="off"
                  style={{ flex: 1 }}
                  disabled={sending || activeCase.requestStatus !== 'approved' || String(activeCase.status || '').toLowerCase() === 'closed'}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={sending || activeCase.requestStatus !== 'approved' || String(activeCase.status || '').toLowerCase() === 'closed'}
                >
                  Send
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LawyerCases;
