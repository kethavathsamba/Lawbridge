import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Clock, AlertCircle, User, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../index.css';

const ClientDashboard = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.cases.list(), api.consultations.list()])
      .then(([casesList, consList]) => {
        setCases(casesList);
        setConsultations(consList);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  }, []);

  const displayName = user?.name || 'User';
  const upcoming = consultations.find((c) => c.status === 'accepted' || c.status === 'pending');

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)' }}>
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid var(--border-color)', padding: '2rem 0' }}>
        <div className="container flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Welcome back, {displayName}!</h1>
            <p className="text-secondary">Overview of your legal matters.</p>
          </div>
          <Link to="/lawyers" className="btn btn-primary">Find a New Lawyer</Link>
        </div>
      </div>
      <div className="container py-8 grid" style={{ gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
        <div className="flex-col gap-8" style={{ display: 'flex' }}>
          {!!error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
              {error}
            </div>
          )}
          {upcoming && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} className="text-primary" /> Upcoming Consultation
              </h3>
              <div className="flex gap-4 p-4" style={{ backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ width: '64px', height: '64px', backgroundColor: '#e2e8f0', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.125rem' }}>{upcoming.lawyerName || 'Lawyer'}</h4>
                  <span className="badge badge-blue">{upcoming.consultType || '—'}</span>
                  <div className="flex gap-4 text-secondary mt-2" style={{ fontSize: '0.875rem' }}>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {upcoming.date}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {upcoming.time}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Case Tracking
            </h3>
            {loading ? (
              <p className="text-secondary">Loading...</p>
            ) : cases.length === 0 ? (
              <p className="text-secondary">No cases yet. Book a consultation to get started.</p>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {(cases || []).slice(0, 3).map((c) => (
                  <div key={c.id} style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 style={{ fontSize: '1.125rem', color: 'var(--primary)' }}>{c.title}</h4>
                      <span className={`badge ${String(c.status || '').toLowerCase() === 'closed' ? 'badge-red' : 'badge-gray'}`}>{c.status}</span>
                    </div>
                    <p className="text-secondary text-sm mb-4">{c.notes}</p>
                    <div style={{ fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Next hearing: </span>
                      <span>{c.nextHearing || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-col gap-6" style={{ display: 'flex' }}>
          <div className="card text-center text-white" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #1e40af 100%)', padding: '2rem 1.5rem' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 1rem', opacity: 0.9 }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Know Your Rights</h3>
            <p style={{ opacity: 0.9, fontSize: '0.875rem', marginBottom: '1.5rem' }}>Legal guides and FAQs.</p>
            <Link to="/hub" className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem' }}>Explore Knowledge Hub</Link>
          </div>
          <div className="card">
            <h4 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Profile</h4>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={24} color="#64748b" />
              </div>
              <div>
                <div style={{ fontWeight: '600' }}>{displayName}</div>
                <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{user?.email}</div>
              </div>
            </div>
            {user?.phone && (
              <div className="flex gap-2 mb-2 text-sm text-secondary"><Phone size={14} /> {user.phone}</div>
            )}
            {user?.address && (
              <div className="flex gap-2 mb-4 text-sm text-secondary"><MapPin size={14} /> {user.address}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
