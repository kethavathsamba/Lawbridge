import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersRoleFilter, setUsersRoleFilter] = useState('all');
  const [pendingLawyers, setPendingLawyers] = useState([]);
  const [cases, setCases] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingCases, setLoadingCases] = useState(true);

  const [error, setError] = useState('');

  const loadAll = (showLoaders = true) => {
    if (showLoaders) setLoadingStats(true);
    api.admin
      .stats()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message || 'Failed to load stats'))
      .finally(() => {
        if (showLoaders) setLoadingStats(false);
      });

    if (showLoaders) setLoadingUsers(true);
    api.admin
      .users()
      .then((data) => setUsers(data))
      .catch((err) => setError(err.message || 'Failed to load users'))
      .finally(() => {
        if (showLoaders) setLoadingUsers(false);
      });

    if (showLoaders) setLoadingPending(true);
    api.admin
      .pendingLawyers()
      .then((data) => setPendingLawyers(data))
      .catch((err) => setError(err.message || 'Failed to load pending lawyers'))
      .finally(() => {
        if (showLoaders) setLoadingPending(false);
      });

    if (showLoaders) setLoadingCases(true);
    api.admin
      .cases()
      .then((data) => setCases(data))
      .catch((err) => setError(err.message || 'Failed to load cases'))
      .finally(() => {
        if (showLoaders) setLoadingCases(false);
      });
  };

  useEffect(() => {
    loadAll(true);
    const id = setInterval(() => loadAll(false), 7000);
    return () => clearInterval(id);
  }, []);

  const handleVerifyLawyer = async (lawyerId, verified) => {
    try {
      await api.admin.verifyLawyer(lawyerId, verified);
      setPendingLawyers((prev) => prev.filter((l) => l.id !== lawyerId));
      setStats((prev) => {
        if (!prev || !verified) return prev;
        return {
          ...prev,
          verifiedLawyers: Math.max(0, (prev.verifiedLawyers || 0) + 1),
        };
      });
    } catch (err) {
      alert(err.message || 'Failed to update verification');
    }
  };

  const handleRejectLawyer = async (lawyerId) => {
    if (!window.confirm('Are you sure you want to reject and delete this lawyer account?')) return;
    try {
      await api.admin.deleteLawyer(lawyerId);
      setPendingLawyers((prev) => prev.filter((l) => l.id !== lawyerId));
      setUsers((prev) => prev.filter((u) => u.id !== lawyerId));
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalUsers: Math.max(0, (prev.totalUsers || 0) - 1),
          totalLawyers: Math.max(0, (prev.totalLawyers || 0) - 1),
        };
      });
    } catch (err) {
      alert(err.message || 'Failed to delete lawyer');
    }
  };

  const visibleUsers = users.filter((u) => u.role !== 'admin');
  const filteredUsers =
    usersRoleFilter === 'all'
      ? visibleUsers
      : visibleUsers.filter((u) => u.role === usersRoleFilter);

  const counts = users.reduce(
    (acc, u) => {
      const r = u.role || 'unknown';
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {}
  );

  const formatDateTime = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const roleClass = (role) => {
    if (role === 'admin') return 'badge-blue';
    if (role === 'lawyer') return 'badge-green';
    return 'badge-gray';
  };

  const statusClass = (status) => {
    if (status === 'Closed') return 'badge-gray';
    if (status === 'Court Filed') return 'badge-blue';
    return 'badge-green';
  };

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Admin Dashboard</h1>
      <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
        Signed in as <strong>{user?.email}</strong>
      </p>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Overview stats */}
      {(loadingStats || loadingUsers) && <div>Loading stats...</div>}
      {stats && !loadingUsers && (
        <div
          className="grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem',
          }}
        >
          <div className="card">
            <h2 className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              Clients
            </h2>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {counts.client || 0}
            </div>
          </div>
          <div className="card">
            <h2 className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              Lawyers
            </h2>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {counts.lawyer || 0}
            </div>
          </div>
          <div className="card">
            <h2 className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              Verified Lawyers
            </h2>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {stats.verifiedLawyers}
            </div>
          </div>
          <div className="card">
            <h2 className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              Active Cases
            </h2>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {stats.activeCases}
            </div>
          </div>
          <div className="card">
            <h2 className="text-secondary" style={{ marginBottom: '0.5rem' }}>
              Consultations (30 days)
            </h2>
            <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>
              {stats.consultationsThisMonth}
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem' }}>Users</h2>
          <select
            className="form-input"
            style={{ maxWidth: '200px' }}
            value={usersRoleFilter}
            onChange={(e) => setUsersRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="client">Clients</option>
            <option value="lawyer">Lawyers</option>
          </select>
        </div>
        {loadingUsers ? (
          <p>Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-secondary">No users found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '-'}</td>
                    <td style={{ wordBreak: 'break-word' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${roleClass(u.role)}`}>{u.role || '-'}</span>
                    </td>
                    <td>{u.phone || '-'}</td>
                    <td style={{ maxWidth: '220px', wordBreak: 'break-word' }}>{u.address || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={async () => {
                            if (!window.confirm(`Delete ${u.role} "${u.email}"? This cannot be undone.`)) return;
                            try {
                              await api.admin.deleteUser(u.id);
                              setUsers((prev) => prev.filter((x) => x.id !== u.id));
                              setPendingLawyers((prev) => prev.filter((x) => x.id !== u.id));
                              setStats((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  totalUsers: Math.max(0, (prev.totalUsers || 0) - 1),
                                  totalLawyers:
                                    u.role === 'lawyer'
                                      ? Math.max(0, (prev.totalLawyers || 0) - 1)
                                      : prev.totalLawyers,
                                  verifiedLawyers:
                                    u.role === 'lawyer'
                                      ? Math.max(
                                          0,
                                          (prev.verifiedLawyers || 0) -
                                            (pendingLawyers.some((x) => x.id === u.id) ? 0 : 1)
                                        )
                                      : prev.verifiedLawyers,
                                };
                              });
                            } catch (err) {
                              alert(err.message || 'Failed to delete user');
                            }
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending lawyer verification */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
          Pending Lawyer Verifications
        </h2>
        {loadingPending ? (
          <p>Loading pending lawyers...</p>
        ) : pendingLawyers.length === 0 ? (
          <p className="text-secondary">No pending verifications.</p>
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
                {pendingLawyers.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name || '-'}</td>
                    <td style={{ wordBreak: 'break-word' }}>{l.email || '-'}</td>
                    <td style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}>{l.barId || '-'}</td>
                    <td>{formatDateTime(l.submitted)}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => handleRejectLawyer(l.id)}
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleVerifyLawyer(l.id, true)}
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

      {/* All cases */}
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>All Cases</h2>
        {loadingCases ? (
          <p>Loading cases...</p>
        ) : cases.length === 0 ? (
          <p className="text-secondary">No cases found.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Lawyer</th>
                  <th>Status</th>
                  <th>Filed</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => (
                  <tr key={c.id}>
                    <td style={{ maxWidth: '320px', wordBreak: 'break-word' }}>{c.title || '-'}</td>
                    <td>{c.client || '-'}</td>
                    <td>{c.lawyer || '-'}</td>
                    <td>
                      <span className={`badge ${statusClass(c.status)}`}>{c.status || '-'}</span>
                    </td>
                    <td>{formatDateTime(c.filed)}</td>
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

export default AdminDashboard;

