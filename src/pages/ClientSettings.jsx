import React from 'react';
import { useAuth } from '../context/AuthContext';
import WalletSettings from '../components/WalletSettings';

const ClientSettings = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Settings</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Manage your profile, contact details, and preferences.
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
              <label className="form-label">Phone</label>
              <input className="form-input" value={user?.phone || ''} disabled />
            </div>
            <div className="form-group mb-3">
              <label className="form-label">Address</label>
              <textarea className="form-input" rows={2} value={user?.address || ''} disabled />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Preferences</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
              This demo keeps preferences simple. In a full product you could manage notification
              channels, language, time zone, and more here.
            </p>
          </div>
        </div>
      </div>
      <WalletSettings />
    </>
  );
};

export default ClientSettings;

