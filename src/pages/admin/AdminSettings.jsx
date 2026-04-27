import React from 'react';
import { useAuth } from '../../context/AuthContext';
import WalletSettings from '../../components/WalletSettings';

const AdminSettings = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Settings</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Manage your admin profile and preferences.
        </p>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Profile</h3>
            <div className="form-group mb-3">
              <label className="form-label">Name</label>
              <input className="form-input" value={user?.name || ''} disabled />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Email</label>
              <input className="form-input" value={user?.email || ''} disabled />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Role</label>
              <input className="form-input" value={user?.role || 'admin'} disabled />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Admin Preferences</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
              Administrative settings and platform configuration options will appear here.
            </p>
          </div>
        </div>
      </div>
      <WalletSettings />
    </>
  );
};

export default AdminSettings;
