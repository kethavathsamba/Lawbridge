import React from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  MessageSquare,
  NotebookText,
  DollarSign,
  Settings,
  Bell,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ClientDashboard from './ClientDashboard';
import SupportChat from './SupportChat';
import ClientConsultations from './ClientConsultations';
import ClientCases from './ClientCases';
import ClientDocuments from './ClientDocuments';
import ClientNotifications from './ClientNotifications';
import ClientBilling from './ClientBilling';
import ClientSettings from './ClientSettings';
import ClientCourtDates from './ClientCourtDates';

const DASHBOARD_BASE = '/dashboard/client';

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to ? `${DASHBOARD_BASE}/${to}` : DASHBOARD_BASE}
    end={!to}
    className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-ghost'}`}
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

const ClientWorkspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [checkingRole, setCheckingRole] = React.useState(true);

  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  if (!checkingRole && user.role !== 'client') {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard/lawyer'} replace />;
  }

  React.useEffect(() => {
    let mounted = true;
    setCheckingRole(true);
    api.auth
      .me()
      .then((me) => {
        if (!mounted) return;
        if (me?.role !== 'client') {
          logout();
          navigate('/auth?mode=login', { replace: true });
        }
      })
      .catch(() => {
        if (!mounted) return;
        logout();
        navigate('/auth?mode=login', { replace: true });
      })
      .finally(() => {
        if (!mounted) return;
        setCheckingRole(false);
      });
    return () => {
      mounted = false;
    };
  }, [logout, navigate]);

  if (checkingRole) {
    return <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>Loading…</div>;
  }

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
          <aside
            className="card"
            style={{
              padding: '1rem',
              height: 'calc(100vh - 7.5rem)',
              position: 'sticky',
              top: '5.5rem',
              overflow: 'auto',
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                {user?.name || 'Client'}
              </div>
              <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                {user?.email}
              </div>
            </div>

            <NavItem to="" icon={LayoutDashboard} label="Overview" />
            <NavItem to="cases" icon={FileText} label="My Cases" />
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
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                padding: '0.75rem 0.875rem',
                gap: '0.75rem',
                marginTop: '0.75rem',
              }}
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
              <Route path="/" element={<ClientDashboard />} />
              <Route
                path="cases"
                element={<ClientCases />}
              />
              <Route
                path="consultations"
                element={<ClientConsultations />}
              />
              <Route
                path="messages"
                element={
                  <SupportChat />
                }
              />
              <Route
                path="documents"
                element={<ClientDocuments />}
              />
              <Route
                path="notifications"
                element={<ClientNotifications />}
              />
              <Route
                path="court-dates"
                element={<ClientCourtDates />}
              />
              <Route
                path="billing"
                element={<ClientBilling />}
              />
              <Route
                path="settings"
                element={<ClientSettings />}
              />
              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ClientWorkspace;

