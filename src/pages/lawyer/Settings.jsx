import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { api } from '../../services/api';
import WalletSettings from '../../components/WalletSettings';

const LawyerSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [qualification, setQualification] = useState('');
  const [barCouncilId, setBarCouncilId] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [location, setLocation] = useState('');
  const [fee, setFee] = useState('');
  const [caseFee, setCaseFee] = useState('');
  const [availability, setAvailability] = useState('');
  const [languages, setLanguages] = useState('');
  const [bio, setBio] = useState('');
  const [available, setAvailable] = useState(true);

  const languagesArray = useMemo(() => {
    const parts = (languages || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    // dedupe
    return Array.from(new Set(parts));
  }, [languages]);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSuccess('');
    api.lawyers
      .me()
      .then((me) => {
        setName(me?.name || '');
        setEmail(me?.email || '');
        setPhone(me?.phone || '');
        setAddress(me?.address || '');

        setQualification(me?.qualification || '');
        setBarCouncilId(me?.barCouncilId || me?.bar_id || '');
        setSpecialization(me?.specialization || me?.spec || '');
        setExperience(me?.experience || me?.exp || '');
        setLocation(me?.location || me?.loc || '');
        setFee(me?.fee || '');
        setCaseFee(me?.caseFee || '');
        setAvailability(me?.availability || '');
        setLanguages(Array.isArray(me?.languages) ? me.languages.join(', ') : (me?.languages || ''));
        setBio(me?.bio || '');
        setAvailable(me?.available ?? true);
      })
      .catch((err) => setError(err?.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.lawyers.updateMe({
        name,
        phone,
        address,
        qualification,
        barCouncilId,
        specialization,
        experience,
        location,
        fee,
        caseFee,
        availability,
        languages: languagesArray,
        bio,
        available,
      });
      setSuccess('Saved successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: '2rem' }}>
      <div className="flex justify-between items-start" style={{ gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Settings</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>
            Update your profile details shown to clients.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}

      {loading ? (
        <p className="text-secondary">Loading settings...</p>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" value={email} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '1.25rem 0' }} />

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input className="form-input" value={qualification} onChange={(e) => setQualification(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Bar Council ID</label>
              <input className="form-input" value={barCouncilId} onChange={(e) => setBarCouncilId(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input className="form-input" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Experience</label>
              <input className="form-input" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 8 Years" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Consultation fee</label>
              <input className="form-input" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. Rs 2000" />
            </div>
            <div className="form-group">
              <label className="form-label">Case fee</label>
              <input className="form-input" value={caseFee} onChange={(e) => setCaseFee(e.target.value)} placeholder="e.g. Rs 15000" />
            </div>
            <div className="form-group">
              <label className="form-label">Availability</label>
              <input className="form-input" value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="e.g. Mon–Sat 10 AM – 6 PM" />
            </div>
            <div className="form-group">
              <label className="form-label">Languages (comma-separated)</label>
              <input className="form-input" value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Hindi" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input id="available" type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
              <label htmlFor="available" className="form-label" style={{ margin: 0 }}>
                Available for new consultations
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Bio</label>
            <textarea className="form-input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>

          <div className="flex justify-end" style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={16} style={{ marginRight: '0.4rem' }} />
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      )}
      <WalletSettings />
    </div>
  );
};

export default LawyerSettings;
