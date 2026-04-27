import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

export default function Billing() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    setLoading(true);
    setError('');
    api.billing
      .invoices()
      .then(setInvoices)
      .catch((e) => setError(e.message || 'Failed to load invoices'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    const clientId = e.target.clientId.value.trim();
    const total = Number(e.target.total.value);
    if (!clientId || Number.isNaN(total)) return;
    setCreating(true);
    try {
      const inv = await api.billing.createInvoice({
        clientId,
        total,
        status: 'pending',
        items: [{ label: e.target.itemLabel.value || 'Legal services', amount: total }],
        dueAt: e.target.dueAt.value || null,
      });
      setInvoices((prev) => [inv, ...prev]);
      e.target.reset();
    } catch (err) {
      setError(err.message || 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const setStatus = async (id, status) => {
    try {
      const inv = await api.billing.updateInvoice(id, { status });
      setInvoices((prev) => prev.map((x) => (x.id === id ? inv : x)));
    } catch (e) {
      setError(e.message || 'Update failed');
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete invoice?')) return;
    try {
      await api.billing.deleteInvoice(id);
      setInvoices((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  return (
    <div className="flex-col gap-4" style={{ display: 'flex' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Billing & Payments</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</div>}
        <form onSubmit={onCreate} className="grid" style={{ gridTemplateColumns: '1fr 160px 1fr 180px 140px', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">Client ID</label>
            <input name="clientId" className="form-input" placeholder="Mongo client id" required />
          </div>
          <div>
            <label className="form-label">Total</label>
            <input name="total" type="number" className="form-input" min="0" step="1" required />
          </div>
          <div>
            <label className="form-label">Item label</label>
            <input name="itemLabel" className="form-input" placeholder="Legal services" />
          </div>
          <div>
            <label className="form-label">Due date (optional)</label>
            <input name="dueAt" type="date" className="form-input" />
          </div>
          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Invoices</h3>
          <button type="button" className="btn btn-outline" onClick={refresh} disabled={loading}>Refresh</button>
        </div>
        {loading ? (
          <p className="text-secondary">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="text-secondary">No invoices yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.clientId}</td>
                    <td>{inv.total}</td>
                    <td>{inv.status}</td>
                    <td>{inv.issuedAt || '—'}</td>
                    <td>{inv.dueAt || '—'}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" className="btn btn-outline" onClick={() => setStatus(inv.id, 'paid')}>Mark paid</button>
                      <button type="button" className="btn btn-outline" onClick={() => setStatus(inv.id, 'overdue')}>Overdue</button>
                      <button type="button" className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }} onClick={() => onDelete(inv.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

