import React from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, Search, FileText, Calendar, MessageSquare, NotebookText, DollarSign, ShieldCheck, Settings, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import LawyerDashboard from './LawyerDashboard';
import LegalHub from './LegalHub';
import Documents from './lawyer/Documents';
import SupportChat from './SupportChat';
import Notifications from './lawyer/Notifications';
import Billing from './lawyer/Billing';
import Research from './lawyer/Research';
import LawyerCases from './lawyer/Cases';
import LawyerConsultations from './lawyer/Consultations';
import LawyerCourtDates from './lawyer/CourtDates';
import LawyerSettings from './lawyer/Settings';

const DASHBOARD_BASE = '/dashboard/lawyer';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to ? `${DASHBOARD_BASE}/${to}` : DASHBOARD_BASE}
    end={!to}
    className={({ isActive }) =>
      `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`
    }
    style={{
      width: '100%',
      justifyContent: 'flex-start',
      padding: '0.75rem 0.875rem',
      gap: '0.75rem',
      borderRadius: 'var(--radius-md)',
      marginBottom: '0.25rem',
    }}
  >
    <Icon size={18} />
    {label}
  </NavLink>
);

const Placeholder = ({ title, subtitle }) => (
  <div className="card" style={{ padding: '1.5rem' }}>
    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{title}</h2>
    <p className="text-secondary">{subtitle}</p>
  </div>
);

const LawyerWorkspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [verified, setVerified] = React.useState(true);
  const [checking, setChecking] = React.useState(true);

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (user.role !== 'lawyer') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard/client'} replace />;
  }

  React.useEffect(() => {
    let mounted = true;
    setChecking(true);
    api.lawyers
      .me()
      .then((p) => {
        if (!mounted) return;
        setVerified(Boolean(p?.verified));
      })
      .catch(() => {
        if (!mounted) return;
        // If profile check fails, block restricted modules instead of showing them.
        setVerified(false);
      })
      .finally(() => {
        if (!mounted) return;
        setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (checking) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  if (!verified) {
    return (
      <div className="container" style={{ padding: '2rem 0' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Verification pending</h1>
          <p className="text-secondary" style={{ marginBottom: '1.25rem', lineHeight: 1.7 }}>
            Your lawyer account is in the waiting list. An admin must approve your profile before you can access the lawyer dashboard modules.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => window.location.reload()}
            >
              Check again
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
          <aside className="card" style={{ padding: '1rem', height: 'calc(100vh - 7.5rem)', position: 'sticky', top: '5.5rem', overflow: 'auto' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>{user?.name || 'Lawyer'}</div>
              <div className="text-secondary" style={{ fontSize: '0.875rem' }}>{user?.email}</div>
            </div>

            <NavItem to="" icon={LayoutDashboard} label="Dashboard" />
            <NavItem to="cases" icon={Briefcase} label="My Cases" />
            <NavItem to="consultations" icon={Calendar} label="Consultations" />
            <NavItem to="messages" icon={MessageSquare} label="Messages / Chat" />
            <NavItem to="documents" icon={NotebookText} label="Documents" />
            <NavItem to="notifications" icon={Bell} label="Notifications" />
            <NavItem to="court-dates" icon={Calendar} label="Court Dates / Calendar" />
            <NavItem to="billing" icon={DollarSign} label="Billing & Payments" />
            <NavItem to="settings" icon={Settings} label="Settings" />

            <button
              type="button"
              className="btn btn-outline"
              style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem 0.875rem', gap: '0.75rem', marginTop: '0.75rem' }}
              onClick={() => {
                logout();
                navigate('/', { replace: true });
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          </aside>

          <section style={{ minWidth: 0 }}>
            <Routes>
              <Route path="/" element={<LawyerDashboard />} />
              <Route path="cases" element={<LawyerCases />} />
              <Route path="consultations" element={<LawyerConsultations />} />
              <Route path="messages" element={<SupportChat />} />
              <Route path="documents" element={<Documents />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="court-dates" element={<LawyerCourtDates />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<LawyerSettings />} />
              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LawyerWorkspace;

