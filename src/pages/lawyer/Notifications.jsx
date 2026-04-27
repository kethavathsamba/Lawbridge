import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = () => {
    setLoading(true);
    setError('');
    api.notifications
      .list()
      .then(setItems)
      .catch((e) => setError(e.message || 'Failed to load notifications'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const markAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      refresh();
    } catch (e) {
      setError(e.message || 'Failed');
    }
  };

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>Notifications</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" className="btn btn-outline" onClick={refresh} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="btn btn-primary" onClick={markAllRead} disabled={loading}>
            Mark all read
          </button>
        </div>
      </div>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>{error}</div>}
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-secondary">No notifications.</p>
      ) : (
        <div className="flex-col" style={{ display: 'flex', gap: '0.75rem' }}>
          {items.map((n) => (
            <div key={n.id} className="card" style={{ boxShadow: 'none', borderLeft: n.readAt ? '4px solid var(--border-color)' : '4px solid var(--primary)' }}>
              <div style={{ fontWeight: 700 }}>{n.title || n.type || 'Notification'}</div>
              <div className="text-secondary" style={{ marginTop: '0.25rem' }}>{n.body || ''}</div>
              <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>{n.createdAt || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

