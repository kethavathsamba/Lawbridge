import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Briefcase, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../index.css';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const initialMode = searchParams.get('mode') || 'login';
  const initialType = searchParams.get('type') || 'client';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [userType, setUserType] = useState(initialType);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const form = e.target;
    try {
      if (isLogin) {
        const email = form.email?.value;
        const password = form.password?.value;
        if (!email || !password) {
          setError('Enter email and password');
          return;
        }
        const u = await login(email, password);
        if (u.role === 'admin') navigate('/admin', { replace: true });
        else if (u.role === 'lawyer') navigate('/dashboard/lawyer', { replace: true });
        else navigate('/dashboard/client', { replace: true });
      } else {
        const fullName = form.fullName?.value;
        const email = form.email?.value;
        const phone = form.phone?.value;
        const password = form.password?.value;
        const qualification = form.qualification?.value;
        const specialization = form.specialization?.value;
        const experience = form.experience?.value;
        const location = form.location?.value;
        const barCouncilId = form.barCouncilId?.value;
        if (!fullName || !email || !phone || !password) {
          setError('Fill all required fields');
          return;
        }
        if (userType === 'lawyer' && (!barCouncilId || !specialization || !experience)) {
          setError('For lawyer signup, Bar Council ID, specialization, and experience are required');
          return;
        }
        await register({
          fullName,
          email,
          phone,
          password,
          userType,
          address: form.address?.value || undefined,
          qualification: qualification || undefined,
          specialization: specialization || undefined,
          experience: experience || undefined,
          location: location || undefined,
          barCouncilId: barCouncilId || undefined,
        });
        if (userType === 'lawyer') navigate('/dashboard/lawyer', { replace: true });
        else navigate('/dashboard/client', { replace: true });
      }
    } catch (err) {
      setError(err.message || err.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>
        <div className="text-center mb-6">
          <h1 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>LawBridge</h1>
          <p className="text-secondary">{isLogin ? 'Welcome back' : 'Create an account to get started'}</p>
        </div>
        {!isLogin && (
          <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 'var(--radius-lg)', padding: '0.25rem', marginBottom: '1.5rem' }}>
            <button type="button" className={`btn ${userType === 'client' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)' }} onClick={() => setUserType('client')}>
              <User size={18} /> I need a Lawyer
            </button>
            <button type="button" className={`btn ${userType === 'lawyer' ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)' }} onClick={() => setUserType('lawyer')}>
              <Briefcase size={18} /> I am a Lawyer
            </button>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}
          {!isLogin && (
            <div className="form-group mb-4">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input name="fullName" type="text" className="form-input" placeholder="John Doe" required style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }} />
              </div>
            </div>
          )}
          <div className="form-group mb-4">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input name="email" type="email" className="form-input" placeholder="you@example.com" required style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }} />
            </div>
          </div>
          {!isLogin && (
            <div className="form-group mb-4">
              <label className="form-label">Phone</label>
              <div style={{ position: 'relative' }}>
                <input name="phone" type="tel" className="form-input" placeholder="+91 98765 43210" required style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }} />
              </div>
            </div>
          )}
          <div className="form-group mb-6">
            <label className="form-label flex justify-between">
              Password
              {isLogin && <Link to="/auth/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>Forgot?</Link>}
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input name="password" type="password" className="form-input" placeholder="••••••••" required style={{ paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' }} />
            </div>
          </div>
          {!isLogin && userType === 'lawyer' && (
            <div className="form-group mb-6 p-4" style={{ backgroundColor: 'rgba(30, 58, 138, 0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: '500' }}>Lawyer Verification</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Admin will verify your Bar Council ID before your profile goes live.</p>
            </div>
          )}
          {!isLogin && userType === 'lawyer' && (
            <>
              <div className="form-group mb-4">
                <label className="form-label">Bar Council ID</label>
                <input name="barCouncilId" type="text" className="form-input" placeholder="BAR/XX/1234/2020" required />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Specialization</label>
                <input name="specialization" type="text" className="form-input" placeholder="Criminal Law" required />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Experience</label>
                <input name="experience" type="text" className="form-input" placeholder="5 years" required />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">Qualification</label>
                <input name="qualification" type="text" className="form-input" placeholder="LL.B, LL.M" />
              </div>
              <div className="form-group mb-6">
                <label className="form-label">Location</label>
                <input name="location" type="text" className="form-input" placeholder="Hyderabad" />
              </div>
            </>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1.125rem' }} disabled={loading}>
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')} <ChevronRight size={18} />
          </button>
        </form>
        <div className="text-center mt-6 text-secondary">
          {isLogin ? (
            <p>Don&apos;t have an account? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setIsLogin(false); setError(''); }}>Sign up</span></p>
          ) : (
            <p>Already have an account? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { setIsLogin(true); setError(''); }}>Sign in</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
