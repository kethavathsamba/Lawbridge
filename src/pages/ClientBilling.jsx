import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const ClientBilling = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = () => {
    setLoading(true);
    setError('');
    // From client side, list all invoices where they are the client.
    api.billing
      .invoices()
      .then((all) => {
        const clientId = null; // server already filters by lawyer; for now just show all shared to client via UI
        setInvoices(all || []);
      })
      .catch((e) => setError(e.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Billing &amp; Payments</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Invoices and payment history for your legal matters.
          </p>
        </div>
        <button type="button" className="btn btn-outline" onClick={refresh} disabled={loading}>
          Refresh
        </button>
      </div>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</div>}
      {loading ? (
        <p className="text-secondary">Loading…</p>
      ) : invoices.length === 0 ? (
        <p className="text-secondary">No invoices yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Lawyer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.lawyerId}</td>
                  <td>{inv.total}</td>
                  <td style={{ textTransform: 'capitalize' }}>{inv.status}</td>
                  <td>{inv.issuedAt || '—'}</td>
                  <td>{inv.dueAt || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientBilling;

