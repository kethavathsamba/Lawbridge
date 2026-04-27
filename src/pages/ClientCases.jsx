import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Calendar, Clock, MessageSquare, Plus, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { convertINRtoPOL, formatCurrency } from '../services/currencyConverter';

const ClientCases = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courtName, setCourtName] = useState('');
  const [caseType, setCaseType] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [offeredAmount, setOfferedAmount] = useState('');
  const [lawyers, setLawyers] = useState([]);
  const [lawyerId, setLawyerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeCaseId, setActiveCaseId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatError, setChatError] = useState('');
  const [sending, setSending] = useState(false);
  const [reviewingInstallmentId, setReviewingInstallmentId] = useState('');
  const [closingCaseId, setClosingCaseId] = useState('');
  const listRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const isMine = (m) => {
    const sid = String(m?.senderId || '');
    return sid === String(user?.id || '') || sid === String(activeCase?.clientId || '');
  };

  const loadCases = () => {
    setLoading(true);
    setError('');
    api.cases
      .list()
      .then((data) => {
        setCases(data || []);
        if (!activeCaseId && data && data.length) {
          setActiveCaseId(data[0].id);
        }
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
    api.lawyers
      .list()
      .then((data) => setLawyers(data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(refreshCasesSilently, 5000);
    return () => clearInterval(id);
  }, [activeCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChat = async (theCase) => {
    if (theCase?.requestStatus !== 'approved') {
      setConversationId(null);
      setMessages([]);
      setChatError('Chat will be enabled after the lawyer approves your case request.');
      return;
    }
    if (!theCase?.lawyerId) {
      setConversationId(null);
      setMessages([]);
      setChatError('No lawyer is assigned to this case yet.');
      return;
    }
    setChatError('');
    try {
      const conv = await api.messages.clientConversationForCase(theCase.id);
      setConversationId(conv.id);
      const msgs = await api.messages.clientThread(conv.id);
      const currentUserId = user?.id;
      setMessages(
        (msgs || []).map((m) => ({
          ...m,
          isMine: currentUserId && m.senderId === currentUserId,
        })),
      );
      if (String(theCase?.status || '').toLowerCase() === 'closed') {
        setChatError('Case is closed. Showing previous chat in read-only mode.');
      }
    } catch (err) {
      const msg = err.message || 'Failed to load chat';
      if (msg.toLowerCase().includes('only clients can access this')) {
        setChatError('Session mismatch detected. Please log out and log in again as a client.');
      } else {
        setChatError(msg);
      }
    }
  };

  useEffect(() => {
    const current = cases.find((c) => c.id === activeCaseId);
    if (current) {
      loadChat(current);
    }
  }, [activeCaseId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await api.messages.clientThread(conversationId);
        const currentUserId = user?.id;
        setMessages(
          (msgs || []).map((m) => ({
            ...m,
            isMine: currentUserId && m.senderId === currentUserId,
          })),
        );
      } catch {
        // ignore poll errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!lawyerId || !title) return;
    setSubmitting(true);
    setError('');
    try {
      await api.cases.create({
        lawyerId,
        title,
        notes: '',
        courtName,
        caseType,
        description,
        filingDate,
        offeredAmount: Number(offeredAmount || 0),
        hearingDates: [],
      });
      setCreating(false);
      setTitle('');
      setDescription('');
      setCourtName('');
      setCaseType('');
      setFilingDate('');
      setOfferedAmount('');
      setLawyerId('');
      setError('Case request sent to lawyer. Chat will be enabled after approval.');
      loadCases();
    } catch (err) {
      const msg = err.message || 'Failed to create case';
      if (msg.toLowerCase().includes('only clients can create cases')) {
        setError('Session mismatch detected. Please log out and log in again as a client.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
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
      await api.messages.clientSend(conversationId, body);
      const msgs = await api.messages.clientThread(conversationId);
      const currentUserId = user?.id;
      setMessages(
        (msgs || []).map((m) => ({
          ...m,
          isMine: currentUserId && m.senderId === currentUserId,
        })),
      );
    } catch (err) {
      setChatError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleInstallmentDecision = async (theCase, requestId, approve) => {
    setReviewingInstallmentId(requestId);
    setError('');
    try {
      const updated = await api.cases.decideInstallment(theCase.id, requestId, approve);
      if (updated?.id) {
        setCases((prev) => (prev || []).map((c) => (c.id === updated.id ? updated : c)));
      } else {
        await loadCases();
      }
      setError(approve ? 'Installment approved and transferred to lawyer.' : 'Installment request rejected.');
    } catch (err) {
      setError(err.message || 'Failed to review installment request');
    } finally {
      setReviewingInstallmentId('');
    }
  };

  const requestCloseCase = async (theCase) => {
    setClosingCaseId(theCase.id);
    setError('');
    try {
      await api.cases.requestClose(theCase.id);
      setError('Close case request sent to lawyer for approval.');
      await loadCases();
    } catch (err) {
      setError(err.message || 'Failed to request case closure');
    } finally {
      setClosingCaseId('');
    }
  };

  const decideCloseCase = async (theCase, approve) => {
    setClosingCaseId(theCase.id);
    setError('');
    try {
      await api.cases.decideClose(theCase.id, approve);
      setError(approve ? 'Case closed and remaining amount transferred.' : 'Close case request rejected.');
      await loadCases();
    } catch (err) {
      setError(err.message || 'Failed to review close case request');
    } finally {
      setClosingCaseId('');
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

  const activeCase = cases.find((c) => c.id === activeCaseId) || null;
  const statusLabel = (c) => c?.status || 'Pending Approval';
  const statusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('reject')) return 'badge-gray';
    if (s.includes('closed')) return 'badge-red';
    if (s.includes('pending')) return 'badge-blue';
    return 'badge-green';
  };
  const inr = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

  return (
    <div className="grid" style={{ gridTemplateColumns: '280px 1.35fr', gap: '1.25rem' }}>
      <div className="card" style={{ padding: '1rem', height: 'calc(100vh - 7rem)', overflow: 'auto' }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>My Cases</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Create a case request and wait for lawyer approval.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCreating(true)}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            <Plus size={16} style={{ marginRight: '0.25rem' }} />
            New Case
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '0.75rem' }}>
            <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-secondary">Loading cases...</p>
        ) : cases.length === 0 ? (
          <p className="text-secondary">You do not have any cases yet. Create one to get started.</p>
        ) : (
          <div className="flex-col" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem' }}>
                  <FileText size={17} style={{ marginTop: '0.15rem', color: 'var(--text-secondary)' }} />
                  <div style={{ textAlign: 'left', minWidth: 0, width: '100%' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                      {c.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span className={`badge ${statusBadgeClass(statusLabel(c))}`}>{statusLabel(c)}</span>
                      {c.nextHearing && (
                        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                          Next: {c.nextHearing}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: '1rem',
          height: 'calc(100vh - 7rem)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {activeCase ? (
          <>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 0 }}>{activeCase.title}</h3>
                {activeCase.requestStatus === 'approved' && String(activeCase.status || '').toLowerCase() !== 'closed' && (
                  <>
                    {activeCase.closeRequest?.status === 'pending' && activeCase.closeRequest?.requestedByRole === 'lawyer' ? (
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
                {activeCase.nextHearing && (
                  <>
                    {' '}
                    • Next hearing:{' '}
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={14} /> {activeCase.nextHearing}
                    </span>
                  </>
                )}
              </div>
              {activeCase.paymentStatus === 'pending' && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '0.375rem', border: '1px solid #ffc107' }}>
                  <p style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: '0.85rem' }}>
                    ⚠️ Payment Required
                  </p>
                  <div style={{ backgroundColor: 'white', padding: '0.5rem', borderRadius: '0.25rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <div style={{fontSize: '1rem', fontWeight: 'bold'}}>₹{Number(activeCase.amountCharged || 0).toLocaleString()}</div>
                    <div style={{fontSize: '0.8rem', color: '#666'}}>≈ {formatCurrency(convertINRtoPOL(activeCase.amountCharged), 'POL')}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/payment/${activeCase.id}`, {
                      state: {
                        caseId: activeCase.id,
                        lawyerAddress: activeCase.lawyerId,
                        amountUSDC: activeCase.amountCharged || 0
                      }
                    })}
                    style={{ width: '100%', padding: '0.4rem' }}
                  >
                    Proceed to Payment
                  </button>
                </div>
              )}
              {activeCase.paymentStatus === 'escrow_held' && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '0.375rem', border: '1px solid #28a745' }}>
                  <p style={{ margin: '0 0 0.25rem 0', color: '#155724', fontSize: '0.85rem' }}>
                    ✓ Amount held in secure escrow
                  </p>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#155724' }}>
                    ₹{Number(activeCase.escrowAmount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#155724', marginTop: '0.25rem' }}>
                    ({formatCurrency(convertINRtoPOL(activeCase.escrowAmount), 'POL')})
                  </div>
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 360px',
                  gap: '0.75rem',
                  marginTop: '0.6rem',
                  alignItems: 'start',
                }}
              >
                <div className="card" style={{ boxShadow: 'none', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Case details</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.7 }}>
                    <div><strong>Lawyer:</strong> {activeCase.lawyerName || activeCase.lawyerId || '—'}</div>
                    <div><strong>Lawyer Email:</strong> {activeCase.lawyerEmail || '—'}</div>
                    <div><strong>Lawyer Phone:</strong> {activeCase.lawyerPhone || '—'}</div>
                    <div><strong>Consultation Fee:</strong> {activeCase.lawyerFee || 'Rs 0'}</div>
                    <div><strong>Case Fee:</strong> {activeCase.lawyerCaseFee || 'Rs 0'}</div>
                    <div><strong>Court:</strong> {activeCase.courtName || '—'}</div>
                    <div><strong>Case Type:</strong> {activeCase.caseType || '—'}</div>
                    <div><strong>Filed on:</strong> {activeCase.filingDate || '—'}</div>
                    <div><strong>Your Offered Amount:</strong> {inr(activeCase.offeredAmount)}</div>
                  </div>
                </div>
                <div className="card" style={{ boxShadow: 'none', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment summary</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem', lineHeight: 1.8 }}>
                    <div>
                      <strong>Amount Charged:</strong> {inr(activeCase.amountCharged)}
                      <div style={{fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem'}}>≈ {formatCurrency(convertINRtoPOL(activeCase.amountCharged), 'POL')}</div>
                    </div>
                    <div><strong>Amount Paid:</strong> {inr(activeCase.amountPaid)}</div>
                    <div><strong>Balance:</strong> {inr(Math.max(0, Number(activeCase.amountCharged || 0) - Number(activeCase.amountPaid || 0)))}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ boxShadow: 'none', marginTop: '0.75rem', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Payment history</div>
              {(activeCase.paymentHistory || []).length === 0 ? (
                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>No payment installments recorded yet.</p>
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

            <div className="card" style={{ boxShadow: 'none', marginTop: '0.75rem', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Installment requests from lawyer</div>
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <strong style={{ fontSize: '0.85rem' }}>{inr(r.amount)}</strong>
                        <span className={`badge ${r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-gray' : 'badge-blue'}`}>{r.status}</span>
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.8rem' }}>{r.progressNote || 'No progress note'}</div>
                      {r.status === 'pending' && String(activeCase.status || '').toLowerCase() !== 'closed' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.45rem' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={reviewingInstallmentId === r.id}
                            onClick={() => handleInstallmentDecision(activeCase, r.id, true)}
                          >
                            Approve and Transfer
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline"
                            disabled={reviewingInstallmentId === r.id}
                            onClick={() => handleInstallmentDecision(activeCase, r.id, false)}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                    ))}
                </div>
              )}
            </div>

            <div
              style={{
                minHeight: '260px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                marginTop: '0.5rem',
                overflow: 'hidden',
              }}
            >
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
                  <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Chat with {activeCase.lawyerName || 'Lawyer'}</span>
                </div>
                <div className="text-secondary" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> Messages related to this case
                </div>
              </div>

              <div
                ref={listRef}
                onScroll={onScroll}
                style={{
                  minHeight: '140px',
                  height: 'min(220px, 28vh)',
                  padding: '0.75rem 0.9rem',
                  overflowY: 'auto',
                  backgroundColor: 'var(--bg-color)',
                }}
              >
                {chatError && (
                  <div className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {chatError}
                  </div>
                )}
                {messages.length === 0 && !chatError && (
                  <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                    {String(activeCase?.status || '').toLowerCase() === 'closed'
                      ? 'This case is closed. Chat is disabled.'
                      : activeCase?.requestStatus === 'approved'
                      ? 'Start a conversation with your lawyer about this case.'
                      : 'Chat will be enabled once your lawyer approves this case request.'}
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
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '0.4rem 0.65rem',
                        borderRadius: '999px',
                        backgroundColor: mine ? 'var(--primary)' : 'white',
                        color: mine ? 'white' : 'inherit',
                        border: mine ? 'none' : '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {m.body}
                    </div>
                  </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSend}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '0.5rem',
                }}
              >
                <input
                  name="body"
                  type="text"
                  placeholder="Type a message..."
                  className="form-input"
                  style={{ flex: 1 }}
                  disabled={!conversationId || sending || String(activeCase?.status || '').toLowerCase() === 'closed'}
                />
                <button type="submit" className="btn btn-primary" disabled={!conversationId || sending || String(activeCase?.status || '').toLowerCase() === 'closed'}>
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center" style={{ flex: 1 }}>
            <p className="text-secondary">Select a case from the left to see details and chat.</p>
          </div>
        )}
      </div>

      {creating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setCreating(false)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '480px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Create new case</h3>
            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              This creates a request. The lawyer must approve before chat is enabled.
            </p>
            <form onSubmit={handleCreateCase}>
              <div className="form-group mb-3">
                <label className="form-label">Title</label>
                <input
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Lawyer</label>
                <select
                  className="form-input"
                  value={lawyerId}
                  onChange={(e) => setLawyerId(e.target.value)}
                  required
                >
                  <option value="">Select lawyer</option>
                  {lawyers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name || l.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Court name (optional)</label>
                <input
                  className="form-input"
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Case type (optional)</label>
                <input
                  className="form-input"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Filing date (optional)</label>
                <input
                  type="date"
                  className="form-input"
                  value={filingDate}
                  onChange={(e) => setFilingDate(e.target.value)}
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Amount you are willing to pay (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="form-input"
                  value={offeredAmount}
                  onChange={(e) => setOfferedAmount(e.target.value)}
                  placeholder="e.g. 12000 or 0.1"
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setCreating(false)}
                  disabled={submitting}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create case'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCases;

