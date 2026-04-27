import React from 'react';
import LawyerDocuments from './lawyer/Documents';

const ClientDocuments = () => {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Documents</h2>
      <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
        Upload and manage documents shared with your lawyers.
      </p>
      <LawyerDocuments />
    </div>
  );
};

export default ClientDocuments;

