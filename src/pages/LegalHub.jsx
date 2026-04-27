import React, { useEffect, useState } from 'react';
import { BookOpen, Search, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import '../index.css';

const LegalHub = () => {
  const [search, setSearch] = useState('');
  const [caseFiles, setCaseFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [detailsById, setDetailsById] = useState({});
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    const q = search.trim();
    api.legalHub
      .caseFiles({ ...(q ? { q } : {}) })
      .then((c) => {
        if (!mounted) return;
        setCaseFiles(c);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || 'Failed to load content');
        setCaseFiles([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [search]);

  const toggleDetails = async (id) => {
    if (!id) return;
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (detailsById[id]) return;
    setLoadingDetails(true);
    try {
      const d = await api.legalHub.caseFileDetails(id);
      setDetailsById((prev) => ({ ...prev, [id]: d }));
    } catch (e) {
      setDetailsById((prev) => ({ ...prev, [id]: { error: e.message || 'Failed to load details' } }));
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)', paddingBottom: '4rem' }}>
      
      {/* Header */}
      <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '3rem 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.9 }} />
          <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Legal Knowledge Hub</h1>
          <p style={{ fontSize: '1.125rem', color: '#e2e8f0', marginBottom: '2rem' }}>
            Simplified legal information, rights awareness, and guides to help you understand Indian law better.
          </p>
          
          <div style={{ position: 'relative', maxWidth: '600px', margin: '0 auto' }}>
            <Search size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search case laws by section, act, or keyword (e.g. IPC 302, bail, FIR, divorce)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '3rem', paddingRight: '1rem', paddingTop: '1rem', paddingBottom: '1rem', fontSize: '1.125rem', borderRadius: 'var(--radius-full)', border: 'none', boxShadow: 'var(--shadow-lg)' }}
            />
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '3rem' }}>

        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} /> Case search results
          </h2>
          {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</div>}
          {loading ? (
            <p className="text-secondary">Searching…</p>
          ) : !search.trim() ? (
            <p className="text-secondary">Type a keyword above to search case laws.</p>
          ) : caseFiles.length === 0 ? (
            <p className="text-secondary">No results found for “{search}”. Try a different keyword.</p>
          ) : (
            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              {caseFiles.map((c) => (
                <div key={c.id} className="card" style={{ boxShadow: 'none', background: 'var(--bg-color)' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{c.title || '—'}</div>
                  <div className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    {c.court || '—'}
                    {c.year ? ` • ${c.year}` : ''}
                    {c.citation ? ` • ${c.citation}` : ''}
                  </div>
                  <div className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {c.summary || '—'}
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button type="button" className="btn btn-outline" onClick={() => toggleDetails(c.id)}>
                      {openId === c.id ? 'Hide details' : 'View details'}
                    </button>
                    {openId === c.id && loadingDetails && !detailsById[c.id] && (
                      <span className="text-secondary" style={{ fontSize: '0.875rem' }}>Loading…</span>
                    )}
                  </div>

                  {openId === c.id && detailsById[c.id] && (
                    <div className="card" style={{ marginTop: '0.75rem', boxShadow: 'none' }}>
                      {detailsById[c.id].error ? (
                        <div style={{ color: 'var(--danger)' }}>{detailsById[c.id].error}</div>
                      ) : (
                        <div className="text-secondary" style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
                          <div><strong>Title:</strong> {detailsById[c.id].title || '—'}</div>
                          <div><strong>Source:</strong> {detailsById[c.id].docsource || '—'}</div>
                          <div><strong>Date:</strong> {detailsById[c.id].publishdate || '—'}</div>
                          <div><strong>Bench:</strong> {detailsById[c.id].bench || '—'}</div>
                          <div><strong>Author/Judge:</strong> {detailsById[c.id].author || '—'}</div>
                          <div><strong>Citation:</strong> {detailsById[c.id].citation || '—'}</div>
                          <div><strong>Cites:</strong> {String(detailsById[c.id].numcites ?? '—')}</div>
                          <div><strong>Cited by:</strong> {String(detailsById[c.id].numcitedby ?? '—')}</div>
                          {detailsById[c.id].url && (
                            <div>
                              <strong>Link:</strong> <a href={detailsById[c.id].url} target="_blank" rel="noreferrer">{detailsById[c.id].url}</a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Need personalized advice?</h3>
          <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
            Connect directly with a verified lawyer to review your specific situation.
          </p>
          <Link to="/lawyers" className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            Find a Lawyer
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LegalHub;
