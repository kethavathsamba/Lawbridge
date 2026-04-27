import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function Documents() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [uploadCaseId, setUploadCaseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const refresh = (selectedCaseId = uploadCaseId) => {
    setLoading(true);
    setError('');
    api.documents
      .list(selectedCaseId || undefined)
      .then(setDocs)
      .catch((e) => setError(e.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.cases
      .list()
      .then((items) => {
        const active = (items || []).filter(
          (c) => c.requestStatus === 'approved' && String(c.status || '').toLowerCase() !== 'closed',
        );
        setCases(active);
        setUploadCaseId(active[0]?.id || '');
        refresh(active[0]?.id || '');
      })
      .catch((e) => {
        setError(e.message || 'Failed to load active cases');
        refresh('');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onUpload = async (e) => {
    e.preventDefault();
    const file = e.target.file.files?.[0];
    if (!file) return;
    const caseId = uploadCaseId || '';
    if (!caseId) {
      setError('Please select an active case');
      return;
    }
    setUploading(true);
    try {
      await api.documents.upload({
        file,
        category: e.target.category.value || 'case_files',
        caseId,
      });
      e.target.reset();
      refresh(caseId);
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.documents.delete(id);
      setDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  return (
    <div className="flex-col gap-4" style={{ display: 'flex' }}>
      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Document Management</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '0.75rem' }}>{error}</div>}
        <form onSubmit={onUpload} className="grid" style={{ gridTemplateColumns: '1fr 160px 160px 140px', gap: '0.75rem', alignItems: 'end' }}>
          <div>
            <label className="form-label">File</label>
            <input name="file" type="file" className="form-input" required />
          </div>
          <div>
            <label className="form-label">Category</label>
            <select name="category" className="form-input" defaultValue="case_files">
              <option value="case_files">Case files</option>
              <option value="evidence">Evidence</option>
              <option value="drafts">Legal drafts</option>
              <option value="orders">Court orders</option>
            </select>
          </div>
          <div>
            <label className="form-label">Case</label>
            <select
              name="caseId"
              className="form-input"
              required
              value={uploadCaseId}
              onChange={(e) => {
                const v = e.target.value;
                setUploadCaseId(v);
                refresh(v);
              }}
            >
              <option value="" disabled>Select active case</option>
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title || c.id}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Your documents</h3>
          <button type="button" className="btn btn-outline" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p className="text-secondary">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-secondary">No documents yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Category</th>
                  <th>Case</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id}>
                    <td>{d.filename}</td>
                    <td>{d.category}</td>
                    <td>{d.caseId || '—'}</td>
                    <td>{d.size ? `${Math.round(d.size / 1024)} KB` : '—'}</td>
                    <td>{d.uploadedAt || '—'}</td>
                    <td style={{ display: 'flex', gap: '0.5rem' }}>
                      <a className="btn btn-outline" href={api.documents.downloadUrl(d.id)} target="_blank" rel="noreferrer">
                        Download
                      </a>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                        onClick={() => onDelete(d.id)}
                        disabled={d.uploadedBy && d.uploadedBy !== user?.id}
                        title={d.uploadedBy && d.uploadedBy !== user?.id ? 'Only uploader can delete' : ''}
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
}
