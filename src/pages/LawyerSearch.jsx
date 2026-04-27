import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Star, Award, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import '../index.css';

const LawyerSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [language, setLanguage] = useState('');
  const [lawyers, setLawyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = {};
    if (searchTerm) params.search = searchTerm;
    if (locationFilter) params.location = locationFilter;
    if (specialization) params.specialization = specialization;
    if (language) params.language = language;
    setLoading(true);
    api.lawyers
      .list(params)
      .then(setLawyers)
      .catch((err) => setError(err.message || 'Failed to load lawyers'))
      .finally(() => setLoading(false));
  }, [searchTerm, locationFilter, specialization, language]);

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)', padding: '2rem 0' }}>
      <div className="container flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Find a Verified Lawyer</h1>
          <p className="text-secondary">Browse our network of top-rated legal professionals.</p>
        </div>
      </div>
      <div className="container grid" style={{ gridTemplateColumns: '280px 1fr', gap: '2rem' }}>
        <div style={{ alignSelf: 'start' }}>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={20} /> Filters
            </h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Search</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" placeholder="Name or keyword" style={{ paddingLeft: '2.25rem' }} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Specialization</label>
              <input type="text" className="form-input" placeholder="e.g. Criminal Law" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Location</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" className="form-input" placeholder="City or court" style={{ paddingLeft: '2.25rem' }} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Language</label>
              <select className="form-input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="">Any</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Marathi">Marathi</option>
                <option value="Tamil">Tamil</option>
              </select>
            </div>
          </div>
        </div>
        <div>
          {error && <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>}
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {loading ? 'Loading...' : `Showing ${lawyers.length} verified lawyers`}
          </div>
          <div className="flex flex-col gap-4">
            {!loading && lawyers.map((lawyer) => (
              <div key={lawyer.id} className="card" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem' }}>
                <div style={{ width: '120px', height: '120px', backgroundColor: lawyer.imgColor || '#cbd5e1', borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: '0.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                        <Link to={`/lawyer/${lawyer.id}`}>{lawyer.name}</Link>
                      </h3>
                      <div className="text-secondary" style={{ fontSize: '0.875rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span className="flex items-center gap-1"><Award size={14} /> {lawyer.spec}</span>
                        <span className="flex items-center gap-1"><MapPin size={14} /> {lawyer.loc}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {lawyer.exp}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="flex items-center justify-end gap-1" style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        <Star size={16} fill="var(--warning)" color="var(--warning)" /> {lawyer.rating}
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>({lawyer.reviews} reviews)</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{lawyer.fee}</span>
                      <span className="text-secondary" style={{ fontSize: '0.875rem' }}> / consultation</span>
                      <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                        Case fee: {lawyer.caseFee || 'Rs 0'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/lawyer/${lawyer.id}`} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>View Profile</Link>
                      <Link to={`/lawyer/${lawyer.id}?book=1`} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Book Now</Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LawyerSearch;
