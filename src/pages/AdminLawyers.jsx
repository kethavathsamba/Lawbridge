import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const AdminLawyers = () => {
  const [lawyers, setLawyers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (showLoader = true) => {
    if (showLoader) setLoading(true);
    Promise.all([api.admin.users('lawyer'), api.admin.pendingLawyers()])
      .then(([users, pendingLawyers]) => {
        setLawyers(users);
        setPending(pendingLawyers);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load lawyers');
      })
      .finally(() => {
        if (showLoader) setLoading(false);
      });
  };

  useEffect(() => {
    load(true);
    const id = setInterval(() => load(false), 7000);
    return () => clearInterval(id);
  }, []);

  const handleVerify = async (lawyerId, verified) => {
    try {
      await api.admin.verifyLawyer(lawyerId, verified);
      setPending((prev) => prev.filter((l) => l.id !== lawyerId));
      setLawyers((prev) =>
        prev.map((l) => (l.id === lawyerId ? { ...l, verified } : l)),
      );
    } catch (err) {
      alert(err.message || 'Failed to update verification');
    }
  };

  const handleDelete = async (lawyerId) => {
    if (!window.confirm('Are you sure you want to delete this lawyer account?')) return;
    try {
      await api.admin.deleteLawyer(lawyerId);
      setPending((prev) => prev.filter((l) => l.id !== lawyerId));
      setLawyers((prev) => prev.filter((l) => l.id !== lawyerId));
    } catch (err) {
      alert(err.message || 'Failed to delete lawyer');
    }
  };

  return (
    <div className="container" style={{ padding: '0' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Lawyer Management</h1>
      <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
        Review, verify, and manage all lawyers on the platform.
      </p>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Pending verifications</h2>
        {loading ? (
          <p>Loading...</p>
        ) : pending.length === 0 ? (
          <p className="text-secondary">No lawyers are awaiting verification.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Bar Council ID</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name || '-'}</td>
                    <td>{l.email || '-'}</td>
                    <td>{l.barId || '-'}</td>
                    <td>{l.submitted || '-'}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => handleDelete(l.id)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleVerify(l.id, true)}
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>All lawyers</h2>
        {loading ? (
          <p>Loading...</p>
        ) : lawyers.length === 0 ? (
          <p className="text-secondary">No lawyers found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Phone</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lawyers.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name || '-'}</td>
                    <td>{l.email}</td>
                    <td>{l.role || 'lawyer'}</td>
                    <td>{l.verified ? 'Yes' : 'No'}</td>
                    <td>{l.phone || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => handleDelete(l.id)}
                      >
                        Delete
                      </button>
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
};

export default AdminLawyers;

