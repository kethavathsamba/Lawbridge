import React from 'react';
import { NavLink, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ShieldCheck,
  BarChart2,
  Settings,
  LogOut,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import AdminLawyers from './AdminLawyers';
import AdminUsers from './AdminUsers';
import AdminSupport from './AdminSupport';
import AdminSettings from './admin/AdminSettings';

const DASHBOARD_BASE = '/admin';

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

const AdminWorkspace = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: 'var(--bg-color)', minHeight: 'calc(100vh - 4rem)' }}>
      <div className="container" style={{ padding: '1.5rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem' }}>
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
                {user?.name || 'Admin'}
              </div>
              <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                {user?.email}
              </div>
            </div>

            <NavItem to="" icon={LayoutDashboard} label="Overview" />
            <NavItem to="users" icon={Users} label="Clients" />
            <NavItem to="lawyers" icon={ShieldCheck} label="Lawyers" />
            <NavItem to="support" icon={MessageSquare} label="Support Chat" />
            <NavItem to="cases" icon={Briefcase} label="Cases" />
            <NavItem to="analytics" icon={BarChart2} label="Analytics" />
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
              <Route path="/" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="lawyers" element={<AdminLawyers />} />
              <Route path="support" element={<AdminSupport />} />
              <Route
                path="cases"
                element={
                  <Placeholder
                    title="Cases"
                    subtitle="Monitor and manage all cases across the platform."
                  />
                }
              />
              <Route
                path="analytics"
                element={
                  <Placeholder
                    title="Analytics"
                    subtitle="Platform metrics and insights will appear here."
                  />
                }
              />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="" replace />} />
            </Routes>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkspace;

