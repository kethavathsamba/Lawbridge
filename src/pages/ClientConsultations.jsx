import React, { useEffect, useState } from 'react';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

const ClientConsultations = () => {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reschedulingId, setReschedulingId] = useState(null);
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    api.consultations
      .list()
      .then((data) => {
        setConsultations(data || []);
      })
      .catch((err) => setError(err.message || 'Failed to load consultations'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openReschedule = (c) => {
    setReschedulingId(c.id);
    setFormDate(c.date || '');
    setFormTime(c.time || '');
    setFormDesc(c.caseDescription || '');
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!reschedulingId) return;
    setSaving(true);
    setError('');
    try {
      await api.consultations.update(reschedulingId, {
        date: formDate,
        time: formTime,
        caseDescription: formDesc,
      });
      setReschedulingId(null);
      load();
    } catch (err) {
      setError(err.message || 'Failed to reschedule consultation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this consultation?')) return;
    setError('');
    try {
      await api.consultations.cancel(id);
      load();
    } catch (err) {
      setError(err.message || 'Failed to cancel consultation');
    }
  };

  const canModify = (c) => c.status === 'pending' || c.status === 'accepted';

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Consultations</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Book, view, reschedule, or cancel your consultations with lawyers.
          </p>
        </div>
        <Link to="/lawyers" className="btn btn-primary">
          Find a Lawyer
        </Link>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-secondary">Loading consultations...</p>
      ) : consultations.length === 0 ? (
        <p className="text-secondary">
          You have no consultations yet. <Link to="/lawyers">Browse lawyers to book your first consultation.</Link>
        </p>
      ) : (
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          {consultations.map((c) => (
            <div
              key={c.id}
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '999px',
                  backgroundColor: '#e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <User size={20} color="#475569" />
              </div>
              <div style={{ flex: 1 }}>
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {c.lawyerName || 'Lawyer'}{' '}
                      <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
                        ({c.consultType || 'consultation'})
                      </span>
                    </div>
                    <div
                      className="flex gap-3 text-secondary mt-1"
                      style={{ fontSize: '0.85rem', alignItems: 'center' }}
                    >
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> {c.date || '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} /> {c.time || '—'}
                      </span>
                    </div>
                  </div>
                  <span
                    className="badge"
                    style={{
                      textTransform: 'capitalize',
                      backgroundColor:
                        c.status === 'accepted'
                          ? 'rgba(22,163,74,0.1)'
                          : c.status === 'pending'
                          ? 'rgba(37,99,235,0.08)'
                          : c.status === 'declined' || c.status === 'cancelled'
                          ? 'rgba(220,38,38,0.08)'
                          : 'rgba(107,114,128,0.08)',
                      color:
                        c.status === 'accepted'
                          ? '#166534'
                          : c.status === 'pending'
                          ? '#1d4ed8'
                          : c.status === 'declined' || c.status === 'cancelled'
                          ? '#b91c1c'
                          : '#374151',
                    }}
                  >
                    {c.status || 'pending'}
                  </span>
                </div>
                {c.caseDescription && (
                  <p className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    {c.caseDescription}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {canModify(c) && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => openReschedule(c)}
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => handleCancel(c.id)}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reschedulingId && (
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
          onClick={() => setReschedulingId(null)}
        >
          <div
            className="card"
            style={{ width: '100%', maxWidth: '420px', padding: '1.5rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Reschedule consultation</h3>
            <form onSubmit={handleReschedule}>
              <div className="form-group mb-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-3">
                <label className="form-label">Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Case description (optional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setReschedulingId(null)}
                  disabled={saving}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientConsultations;

