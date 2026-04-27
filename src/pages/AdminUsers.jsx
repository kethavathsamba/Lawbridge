import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (showLoader = true) => {
    if (showLoader) setLoading(true);
    api.admin
      .users('client')
      .then((data) => {
        setUsers(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load users');
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

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete ${u.role} "${u.email}"? This cannot be undone.`)) return;
    try {
      await api.admin.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="container" style={{ padding: '0' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Clients</h1>
      <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
        View all client accounts and remove them if needed.
      </p>

      {error && (
        <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem' }}>All clients</h2>
        </div>
        {loading ? (
          <p>Loading clients...</p>
        ) : users.length === 0 ? (
          <p className="text-secondary">No clients found.</p>
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name || '-'}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.phone || '-'}</td>
                    <td>{u.address || '-'}</td>
                    <td style={{ textAlign: 'right' }}>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                          onClick={() => handleDelete(u)}
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
    </div>
  );
};

export default AdminUsers;

