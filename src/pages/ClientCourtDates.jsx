import React, { useEffect, useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { api } from '../services/api';

const ClientCourtDates = () => {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.cases
      .list()
      .then((data) => setCases(data || []))
      .catch((e) => setError(e.message || 'Failed to load court dates'))
      .finally(() => setLoading(false));
  }, []);

  const withHearings = cases.flatMap((c) =>
    (c.hearingDates || []).map((d) => ({
      caseId: c.id,
      caseTitle: c.title,
      date: d,
      next: c.nextHearing,
    })),
  );

  return (
    <div className="card" style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Court Dates / Calendar</h2>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Upcoming court dates across all your active cases.
      </p>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</div>}
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : withHearings.length === 0 ? (
        <p className="text-secondary">No court dates recorded yet.</p>
      ) : (
        <div className="flex-col" style={{ display: 'flex', gap: '0.75rem' }}>
          {withHearings.map((h, idx) => (
            <div key={idx} className="card" style={{ boxShadow: 'none' }}>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{h.caseTitle}</div>
              <div className="text-secondary" style={{ fontSize: '0.9rem', display: 'flex', gap: '1rem' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Calendar size={14} /> {h.date}
                </span>
                {h.next && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Clock size={14} /> Next: {h.next}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientCourtDates;

