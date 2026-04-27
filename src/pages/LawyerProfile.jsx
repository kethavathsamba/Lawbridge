import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { MapPin, Star, CheckCircle, MessageSquare, Briefcase } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import '../index.css';

const LawyerProfile = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [lawyer, setLawyer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(searchParams.get('book') === '1');
  const [consultType, setConsultType] = useState('inperson');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [caseDesc, setCaseDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.lawyers.get(id).then(setLawyer).catch(() => setLawyer(null)).finally(() => setLoading(false));
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!user) {
      window.location.href = '/auth?mode=login';
      return;
    }
    setSubmitting(true);
    try {
      await api.consultations.book({ lawyerId: id, consultType, date, time, caseDescription: caseDesc });
      setBookingOpen(false);
    } catch (err) {
      alert(err.message || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading...</div>;
  if (!lawyer) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Lawyer not found. <Link to="/lawyers">Back to search</Link></div>;

  const languages = Array.isArray(lawyer.languages) ? lawyer.languages.join(', ') : (lawyer.languages || '');

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)', paddingBottom: '4rem' }}>
      {/* Profile Header Block */}
      <div style={{ backgroundColor: 'var(--primary)', padding: '2rem 0 4rem', color: 'white' }}>
        <div className="container">
          <Link to="/lawyers" className="text-secondary hover:text-white" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
            &larr; Back to Search
          </Link>
          <div className="flex gap-6 items-start">
            <div style={{ width: '160px', height: '160px', borderRadius: 'var(--radius-lg)', background: lawyer.imgColor || '#cbd5e1', border: '4px solid white', boxShadow: 'var(--shadow-lg)' }} />
            <div style={{ flex: 1, marginTop: '0.5rem' }}>
              <div className="flex justify-between items-start">
                <div>
                  <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{lawyer.name}</h1>
                  <p style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '1rem' }}>{lawyer.spec}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {lawyer.verified && (
                  <div className="badge badge-green" style={{ fontSize: '1rem', padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
                    <CheckCircle size={16} style={{ marginRight: '0.25rem' }} /> Verified by Bar Council
                  </div>
                )}
                  <div className="flex items-center gap-1" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    <Star fill="var(--warning)" color="var(--warning)" size={20} /> {lawyer.rating} <span style={{ fontWeight: 'normal', fontSize: '1rem', opacity: 0.8 }}>({lawyer.reviews} Reviews)</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-6 mt-2" style={{ color: '#e2e8f0' }}>
                <span className="flex items-center gap-2"><Briefcase size={18}/> {lawyer.exp} Experience</span>
                <span className="flex items-center gap-2"><MapPin size={18}/> {lawyer.loc}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container grid" style={{ gridTemplateColumns: '1fr 350px', gap: '2rem', marginTop: '-2rem' }}>
        
        {/* Main Info Column */}
        <div className="flex-col gap-6" style={{ display: 'flex' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>About</h2>
            <p className="text-secondary" style={{ lineHeight: '1.8' }}>{lawyer.bio || 'No bio provided.'}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Languages Spoken</h4>
                <p style={{ fontWeight: 500 }}>{languages || '—'}</p>
              </div>
              <div>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Bar Council Registration</h4>
                <p style={{ fontWeight: 500 }}>{lawyer.bar_id || '—'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Specializations</h2>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {((lawyer.specTags && lawyer.specTags.length) ? lawyer.specTags : [lawyer.spec].filter(Boolean)).map((tag) => (
                <span key={tag} className="badge badge-gray" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>{tag}</span>
              ))}
            </div>
          </div>
          
          <div className="card">
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>Patient Reviews</h2>
            {[1, 2].map((review) => (
              <div key={review} style={{ padding: '1.5rem 0', borderBottom: review === 1 ? '1px solid var(--border-color)' : 'none' }}>
                <div className="flex justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>J</div>
                    <span style={{ fontWeight: '600' }}>John Doe</span>
                  </div>
                  <div className="flex">
                    {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="var(--warning)" color="var(--warning)" />)}
                  </div>
                </div>
                <p className="text-secondary mt-2">"Excellent lawyer with deep knowledge of criminal law. Helped me navigate a complex case and kept me informed every step of the way."</p>
              </div>
            ))}
          </div>

        </div>

        {/* Sidebar Booking Column */}
        <div style={{ alignSelf: 'start' }}>
          <div className="card" style={{ position: 'sticky', top: '5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <p className="text-secondary" style={{ marginBottom: '0.5rem' }}>Consultation Fee</p>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>{lawyer.fee}</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>per 30 minute session</p>
              <p className="text-secondary" style={{ marginTop: '0.6rem' }}>Case Fee</p>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{lawyer.caseFee || 'Rs 0'}</h3>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Book Consultation</h3>
            
            <div className="flex flex-col gap-3 mb-6">
              <label className="card" style={{ padding: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'none' }}>
                <input
                  type="radio"
                  name="consult_type"
                  checked={consultType === 'inperson'}
                  onChange={() => setConsultType('inperson')}
                />
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2" style={{ fontWeight: '600' }}><MapPin size={18}/> In Person</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Visit chamber</div>
                </div>
              </label>
            </div>
            
            <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.125rem' }} onClick={() => setBookingOpen(true)}>
              Schedule Appointment
            </button>
            {bookingOpen && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h4 style={{ marginBottom: 0, fontSize: '1.1rem' }}>Book Consultation</h4>
                  <button type="button" className="btn btn-outline" onClick={() => setBookingOpen(false)} style={{ padding: '0.35rem 0.6rem' }}>
                    Close
                  </button>
                </div>
                {!user ? (
                  <p className="text-secondary">Please <Link to="/auth?mode=login">log in</Link> to book.</p>
                ) : (
                  <form onSubmit={handleBook}>
                    <div className="form-group mb-4">
                      <label className="form-label">Type</label>
                        <select className="form-input" value={consultType} onChange={(e) => setConsultType(e.target.value)}>
                          <option value="inperson">In person</option>
                        </select>
                    </div>
                    <div className="form-group mb-4">
                      <label className="form-label">Date</label>
                      <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label className="form-label">Time</label>
                      <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} required />
                    </div>
                    <div className="form-group mb-4">
                      <label className="form-label">Case description (optional)</label>
                      <textarea className="form-input" rows={2} value={caseDesc} onChange={(e) => setCaseDesc(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                      {submitting ? 'Booking...' : 'Confirm'}
                    </button>
                  </form>
                )}
              </div>
            )}
            <p className="text-center mt-4" style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Secure payment processing. You won't be charged yet.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LawyerProfile;
