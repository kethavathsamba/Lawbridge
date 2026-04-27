import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Scale } from 'lucide-react';
import './index.css';
import './App.css';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import LawyerSearch from './pages/LawyerSearch';
import LawyerProfile from './pages/LawyerProfile';
import Auth from './pages/Auth';
import ClientDashboard from './pages/ClientDashboard';
import LawyerDashboard from './pages/LawyerDashboard';
import LawyerWorkspace from './pages/LawyerWorkspace';
import ClientWorkspace from './pages/ClientWorkspace';
import LegalHub from './pages/LegalHub';
import AdminDashboard from './pages/AdminDashboard';
import AdminWorkspace from './pages/AdminWorkspace';
import Payment from './pages/Payment';
import AdminEscrowDashboard from './pages/admin/AdminEscrowDashboard';

const Navbar = () => {
  const location = useLocation();
  const { user, logout, loading } = useAuth();
  const isAuthPage = location.pathname === '/auth';

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <Scale size={28} />
          LawBridge
        </Link>
        {!isAuthPage && !loading && (
          <>
            <div className="nav-links">
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
              <Link to="/lawyers" className={`nav-link ${location.pathname === '/lawyers' ? 'active' : ''}`}>Find Lawyers</Link>
              <Link to="/hub" className={`nav-link ${location.pathname === '/hub' ? 'active' : ''}`}>Legal Hub</Link>
            </div>
            <div className="nav-actions">
              {user ? (
                <>
                  <span className="text-secondary" style={{ marginRight: '0.5rem', fontSize: '0.875rem' }}>{user.name}</span>
                  <Link
                    to={
                      user.role === 'admin'
                        ? '/admin'
                        : (user.role === 'lawyer' ? '/dashboard/lawyer' : '/dashboard/client')
                    }
                    className="btn btn-ghost"
                  >
                    Dashboard
                  </Link>
                  <button type="button" className="btn btn-ghost" onClick={logout}>Log out</button>
                </>
              ) : (
                <>
                  <Link to="/auth?mode=login" className="btn btn-ghost">Log in</Link>
                  <Link to="/auth?mode=register" className="btn btn-primary">Sign up</Link>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/auth?mode=login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user || user.role !== 'admin') return <Navigate to="/auth?mode=login" replace />;
  return children;
}

const Footer = () => {
  const location = useLocation();
  const isDashboard = location.pathname.includes('dashboard');
  
  if (isDashboard) return null; // Don't show footer on dashboards

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="logo" style={{ color: 'white', marginBottom: '1rem' }}>
              <Scale size={24} />
              LawBridge
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Bridging the gap between citizens and legal resources. Making legal help accessible to everyone.
            </p>
          </div>
          <div className="footer-col">
            <h4>For Clients</h4>
            <ul>
              <li><Link to="/lawyers">Find a Lawyer</Link></li>
              <li><Link to="/hub">Legal Knowledge Hub</Link></li>
              <li><Link to="#">How it Works</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>For Lawyers</h4>
            <ul>
              <li><Link to="/auth?mode=register&type=lawyer">Join the Network</Link></li>
              <li><Link to="#">Verified Benefits</Link></li>
              <li><Link to="#">Lawyer Dashboard</Link></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <ul>
              <li><Link to="#">Help Center</Link></li>
              <li><Link to="#">Privacy Policy</Link></li>
              <li><Link to="#">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; {new Date().getFullYear()} LawBridge. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

function App() {
  return (
    <Router>
      <div className="app-layout">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lawyers" element={<LawyerSearch />} />
            <Route path="/lawyer/:id" element={<LawyerProfile />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/payment/:caseId" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/admin/*" element={<AdminRoute><AdminWorkspace /></AdminRoute>} />
            <Route path="/admin/escrow" element={<AdminRoute><AdminEscrowDashboard /></AdminRoute>} />
            <Route path="/dashboard/client/*" element={<ProtectedRoute><ClientWorkspace /></ProtectedRoute>} />
            <Route path="/dashboard/lawyer/*" element={<ProtectedRoute><LawyerWorkspace /></ProtectedRoute>} />
            <Route path="/hub" element={<LegalHub />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
