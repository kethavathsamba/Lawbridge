import React from 'react';
import LawyerNotifications from './lawyer/Notifications';

const ClientNotifications = () => {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Notifications</h2>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Alerts about case updates, consultations, and messages.
      </p>
      <LawyerNotifications />
    </div>
  );
};

export default ClientNotifications;

