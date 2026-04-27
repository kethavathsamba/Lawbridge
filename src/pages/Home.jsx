import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Shield, Clock, MessageSquare, ArrowRight, Star } from 'lucide-react';
import '../index.css';

const Home = () => {
  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section" style={{
        backgroundColor: 'var(--primary)',
        color: 'white',
        padding: '6rem 0',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract background pattern for premium feel */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          opacity: 0.1,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(135deg, transparent 25%, white 25%, white 50%, transparent 50%, transparent 75%, white 75%, white 100%)',
          backgroundSize: '40px 40px',
          animation: 'slideBackground 20s linear infinite'
        }} />
        
        <div className="container" style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', leading: '1.1' }}>
              Expert Legal Help,<br/>When You Need It Most.
            </h1>
            <p style={{ fontSize: '1.25rem', color: '#e2e8f0', marginBottom: '2rem', maxWidth: '500px' }}>
              LawBridge connects you with verified legal professionals. Affordable consultations, secure communications, and transparent case tracking.
            </p>
            <div className="flex gap-4">
              <Link to="/lawyers" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '1.125rem' }}>
                Find a Lawyer <ArrowRight size={20} />
              </Link>
              <Link to="/auth?mode=register&type=lawyer" className="btn" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 1.5rem', fontSize: '1.125rem' }}>
                Join as Lawyer
              </Link>
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            {/* Minimalist abstract hero graphic */}
            <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-4 mb-6">
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={32} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem' }}>Verified Network</h3>
                  <p className="text-secondary">500+ Bar Council certified experts</p>
                </div>
              </div>
              
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                <div className="form-group">
                  <label className="form-label">What legal help do you need?</label>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                    <input type="text" className="form-input" placeholder="e.g. Property Dispute" style={{ paddingLeft: '3rem' }} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <div style={{ position: 'relative' }}>
                    <input type="text" className="form-input" placeholder="City or Pincode" />
                  </div>
                </div>
                <Link to="/lawyers" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', display: 'flex' }}>Search Lawyers</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--bg-color)' }}>
        <div className="container text-center">
          <h2 style={{ marginBottom: '1rem' }}>How LawBridge Works</h2>
          <p className="text-secondary" style={{ maxWidth: '600px', margin: '0 auto 4rem' }}>
            Simplifying your journey to legal resolution into three easy steps.
          </p>
          
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: <Search size={40}/>, title: 'Find the Right Expert', desc: 'Search our directory by specialization, location, and rating.' },
              { icon: <Clock size={40}/>, title: 'Book a Consultation', desc: 'Schedule a secure in-person session.' },
              { icon: <MessageSquare size={40}/>, title: 'Resolve Your Case', desc: 'Securely share documents and track case progress online.' }
            ].map((step, idx) => (
              <div key={idx} className="card text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(30, 58, 138, 0.1)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {step.icon}
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>{step.title}</h3>
                <p className="text-secondary">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Specializations */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--surface-color)' }}>
         <div className="container">
           <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
             <h2>Find Help by Practice Area</h2>
             <Link to="/lawyers" className="btn btn-outline">View All</Link>
           </div>
           
           <div className="grid grid-cols-4 gap-4">
             {['Family Law', 'Property Disputes', 'Corporate & Startup', 'Criminal Defense', 'Cyber Crime', 'Immigration', 'Labor & Employment', 'Civil Litigation'].map((area, idx) => (
               <Link to={`/lawyers?category=${area}`} key={idx} className="card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', textDecoration: 'none' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Shield size={24} className="text-primary"/>
                  </div>
                  <h4 style={{ fontSize: '1.125rem' }}>{area}</h4>
               </Link>
             ))}
           </div>
         </div>
      </section>
      
      {/* Testimonials */}
      <section style={{ padding: '5rem 0', backgroundColor: 'var(--primary)', color: 'white' }}>
        <div className="container">
          <h2 className="text-center" style={{ marginBottom: '3rem' }}>Trusted by Thousands</h2>
          <div className="grid grid-cols-3 gap-8">
             {[1,2,3].map(i => (
               <div key={i} style={{ background: 'rgba(255,255,255,0.1)', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                 <div className="flex gap-1 mb-4">
                   {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="var(--secondary)" color="var(--secondary)" />)}
                 </div>
                 <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>"LawBridge made it incredibly easy to find a corporate lawyer for my startup. The process was transparent and I knew exactly what I was paying for."</p>
                 <div className="flex items-center gap-3">
                   <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                   <div>
                     <div style={{ fontWeight: '600' }}>Sarah Jenkins</div>
                     <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Found a Startup Lawyer</div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
