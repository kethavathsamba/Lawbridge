import React, { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, Clock, Calendar, MessageSquare, DollarSign, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../index.css';

const LawyerDashboard = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      if (!silent) setError('');
      try {
        const [cons, cas] = await Promise.all([api.consultations.list(), api.cases.list()]);
        setConsultations(cons || []);
        setCases(cas || []);
      } catch (e) {
        if (!silent) setError(e.message || 'Failed to load dashboard');
      } finally {
        if (!silent) setLoading(false);
      }
    };

    load(false);
    const id = setInterval(() => load(true), 5000);
    return () => clearInterval(id);
  }, []);

  const pending = consultations.filter((c) => c.status === 'pending');
  const accepted = consultations.filter((c) => c.status === 'accepted' || c.status === 'completed');
  const activeCases = (cases || []).filter(
    (c) => c.requestStatus === 'approved' && String(c.status || '').toLowerCase() !== 'closed',
  );
  const pendingCaseRequests = (cases || []).filter((c) => c.requestStatus === 'pending');
  const revenue = (cases || []).reduce((sum, c) => sum + Number(c?.amountPaid || 0), 0);
  const inr = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
  const displayName = user?.name || 'Lawyer';

  const handleCaseDecision = async (caseId, approve) => {
    try {
      const res = await api.cases.decide(caseId, approve);
      if (approve && res?.id) {
        setCases((prev) => (prev || []).map((c) => (c.id === res.id ? res : c)));
      } else {
        // reject deletes the case server-side
        setCases((prev) => (prev || []).filter((c) => c.id !== caseId));
      }
    } catch (e) {
      alert(e.message || 'Failed to review case request');
    }
  };

  const handleRespond = async (consultId, accept) => {
    try {
      await api.consultations.respond(consultId, accept);
      setConsultations((prev) => prev.map((c) => (c.id === consultId ? { ...c, status: accept ? 'accepted' : 'declined' } : c)));
    } catch (e) {
      alert(e.message || 'Failed');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: '4rem', zIndex: 40 }}>
        <div className="container flex items-center justify-between" style={{ height: '4rem' }}>
          <div className="flex items-center gap-6" style={{ height: '100%' }}>
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: '600', padding: '0 0.5rem' }}>Dashboard Overview</div>
          </div>
          <button type="button" className="btn btn-outline" style={{ padding: '0.5rem' }}><Settings size={18} /></button>
        </div>
      </div>

      <div className="container py-8">
        {error && (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--warning)' }}>
            <p className="text-secondary">
              {error === 'Lawyer account pending admin approval'
                ? 'Your lawyer account is pending admin approval. You will see your dashboard once an admin approves your profile.'
                : error}
            </p>
          </div>
        )}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Welcome, {displayName}</h1>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
            {[
              { label: 'Active Cases', val: String(activeCases.length), icon: FileText, color: 'var(--primary)' },
              { label: 'Pending Cases', val: String(pendingCaseRequests.length), icon: Clock, color: 'var(--warning)' },
              { label: 'Pending Consultations', val: String(pending.length), icon: Clock, color: 'var(--warning)' },
              { label: 'Consultations', val: String(accepted.length), icon: CheckCircle, color: 'var(--success)' },
              { label: 'Revenue', val: inr(revenue), icon: DollarSign, color: 'var(--text-secondary)' },
            ].map((s, idx) => (
              <div key={idx} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{s.label}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{s.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
          <div className="flex-col gap-6" style={{ display: 'flex' }}>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Pending Case Requests</h3>
                <span className="badge badge-gray" style={{ background: '#fef3c7', color: '#b45309' }}>{pendingCaseRequests.length} Pending</span>
              </div>
              <div>
                {loading ? (
                  <p style={{ padding: '1.5rem' }} className="text-secondary">Loading...</p>
                ) : pendingCaseRequests.length === 0 ? (
                  <p style={{ padding: '1.5rem' }} className="text-secondary">No pending case requests.</p>
                ) : (
                  pendingCaseRequests.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{c.title || 'Untitled Case'}</div>
                        <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                          {c.clientName || 'Client'} • Offer: Rs {Number(c.offeredAmount || 0).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          onClick={() => handleCaseDecision(c.id, false)}
                        >
                          Reject
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleCaseDecision(c.id, true)}>
                          Approve
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Consultation Requests</h3>
                <span className="badge badge-gray" style={{ background: '#fef3c7', color: '#b45309' }}>{pending.length} Pending</span>
              </div>
              <div>
                {loading ? (
                  <p style={{ padding: '1.5rem' }} className="text-secondary">Loading...</p>
                ) : pending.length === 0 ? (
                  <p style={{ padding: '1.5rem' }} className="text-secondary">No pending requests.</p>
                ) : (
                  pending.map((req) => (
                    <div key={req.id} className="flex items-center justify-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div className="flex gap-4 items-center">
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Users size={20} color="#94a3b8" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{req.clientName || 'Client'}</div>
                          <div className="text-secondary" style={{ fontSize: '0.875rem' }}>{req.consultType} • {req.date} {req.time}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleRespond(req.id, false)}>Decline</button>
                        <button type="button" className="btn btn-primary" onClick={() => handleRespond(req.id, true)}>Accept</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Active Cases Outline */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Recent Case Activity</h3>
                <button className="text-primary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>View All Cases</button>
              </div>
              
              <div style={{ padding: '1.5rem' }}>
                <div style={{ borderLeft: '2px solid var(--border-color)', margin: '0 1rem' }}>
                   {[
                     { client: 'Rajeev Singh', action: 'Uploaded new Document (evidence.pdf)', time: '2 hours ago' },
                     { client: 'System', action: 'Hearing scheduled in High Court (Room 42)', time: 'Yesterday' }
                   ].map((log, idx) => (
                     <div key={idx} style={{ position: 'relative', paddingLeft: '1.5rem', paddingBottom: '1.5rem' }}>
                       <div style={{ position: 'absolute', left: '-5px', top: '5px', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></div>
                       <p style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}><strong>{log.client}</strong>: {log.action}</p>
                       <p className="text-muted" style={{ fontSize: '0.75rem' }}>{log.time}</p>
                     </div>
                   ))}
                </div>
              </div>
            </div>

          </div>
        </div>

          {/* Schedule Sidebar */}
          <div className="flex-col gap-6" style={{ display: 'flex' }}>
            
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18}/> Today's Schedule
                </h3>
              </div>
              
              <div className="flex-col gap-3" style={{ display: 'flex' }}>
                {[
                  { time: '10:00 AM', name: 'Alok Gupta', type: 'Initial Consult' },
                  { time: '2:30 PM', name: 'Megha Reddy', type: 'Follow up' },
                  { time: '4:30 PM', name: 'John Doe', type: 'Phone Call', highlight: true }
                ].map((mtg, idx) => (
                  <div key={idx} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: mtg.highlight ? 'rgba(30, 58, 138, 0.05)' : 'var(--bg-color)', borderLeft: `3px solid ${mtg.highlight ? 'var(--primary)' : 'var(--text-muted)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{mtg.name}</div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{mtg.type}</div>
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.875rem', fontWeight: 500 }}>{mtg.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card text-center" style={{ backgroundColor: '#f8fafc', border: '1px dashed var(--border-color)' }}>
              <MessageSquare size={24} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
              <h4 style={{ marginBottom: '0.5rem' }}>Client Messages</h4>
              <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>You have 4 unread messages from clients.</p>
              <button className="btn btn-outline" style={{ width: '100%', padding: '0.5rem' }}>Open Inbox</button>
            </div>
          </div>

      </div>
    </div>
  );
};

export default LawyerDashboard;
