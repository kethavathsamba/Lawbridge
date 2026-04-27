import React from 'react';
import LegalHub from '../LegalHub';

export default function Research() {
  return (
    <div className="flex-col gap-3" style={{ display: 'flex' }}>
      <div className="card" style={{ padding: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Legal Research</h2>
        <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
          Search judgments and case summaries (powered by your Legal Hub / Indian Kanoon integration).
        </p>
      </div>
      <LegalHub />
    </div>
  );
}

