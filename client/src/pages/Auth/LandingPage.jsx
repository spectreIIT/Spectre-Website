import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Trophy, Users, Layers, FileText, ArrowRight, LogIn, Mail } from 'lucide-react';
import GlitchLogo from '../../components/ui/GlitchLogo';
import '../../styles/pages/LandingPage.css';

const Instagram = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

const Linkedin = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect width="4" height="12" x="2" y="9"/>
    <circle cx="4" cy="4" r="2"/>
  </svg>
);

const Github = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);

const Discord = ({ size = 20, color = 'currentColor' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
    <path d="M18.99 5.86c-1.37-.8-2.88-1.29-4.48-1.46-.3.56-.63 1.25-.86 1.84-1.63-.25-3.23-.25-4.83 0-.23-.59-.57-1.28-.88-1.84-1.59.17-3.11.66-4.47 1.46-3.05 4.54-3.87 10.35-3.02 16.02 1.83 1.34 3.6 2.14 5.34 2.68.43-.58.82-1.2 1.15-1.85-1.07-.41-2.09-.94-3.04-1.56.26-.19.51-.39.75-.6 3.1 1.43 6.47 1.43 9.54 0 .24.21.49.41.76.6-.96.62-1.98 1.15-3.05 1.56.33.65.73 1.27 1.16 1.85 1.74-.54 3.51-1.34 5.34-2.68.96-6.19-.24-11.83-3.21-16.02z" />
  </svg>
);

function LiveDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now.toLocaleString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Animated count-up hook
function useCountUp(target, duration = 1200) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const end = target;
    prevTarget.current = end;
    if (end === 0) { setCount(0); return; }

    const steps = 40;
    const stepTime = duration / steps;
    let current = start;
    const increment = (end - start) / steps;

    const timer = setInterval(() => {
      current += increment;
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.round(current));
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration]);

  return count;
}

function LandingPage() {
  const [stats, setStats] = useState({ players: 0, writeups: 0, tracks: 8, challenges: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/users/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(prev => ({
          ...prev,
          players: data.players ?? prev.players,
          writeups: data.writeups ?? prev.writeups,
          tracks: data.tracks ?? prev.tracks,
        }));
        setStatsLoaded(true);
      }
    } catch (err) {
      // silently fail — stats stay at last known values
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const animChallenges = useCountUp(stats.challenges);
  const animPlayers    = useCountUp(stats.players);
  const animTracks     = useCountUp(stats.tracks);
  const animWriteups   = useCountUp(stats.writeups);

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="landing-logo">
          <img src="/Illustration.png" alt="Spectre Logo" className="nav-logo-img" />
          <img 
            src="https://see.fontimg.com/api/rf5/0Mxv/ZDNmMDAxY2QxNjZjNGFjMzk1MWQ3Njg2MDZhZmIzZDAudHRm/U1BFQ1RSRQ/pixeldraw.png?r=fs&h=65&w=1000&fg=00F0FF&tb=1&s=65" 
            alt="Spectre" 
            style={{ height: '24px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.4))' }}
          />
        </div>
        <div className="nav-links">
          <Link to="/" className="nav-link active">
            <span className="nav-prefix">{'>_'}</span> Home
          </Link>
          <Link to="/challenges" className="nav-link">
            <Shield size={16} /> Challenges
          </Link>
          <Link to="/scoreboard" className="nav-link">
            <Trophy size={16} /> Scoreboard
          </Link>
        </div>
        <div className="nav-auth">
          <Link to="/login" className="login-link">
            <LogIn size={16} /> Login
          </Link>
          <Link to="/register" className="btn btn-outline">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="hero-section">
        <div className="hero-graphic">
          <GlitchLogo 
            src="/Illustration.png" 
            alt="Spectre Rose Logo" 
            className="main-illustration"
          />
        </div>
        <h1 className="hero-glitch-title" style={{ display: 'flex', justifyContent: 'center' }}>
          <img 
            src="https://see.fontimg.com/api/rf5/0Mxv/ZDNmMDAxY2QxNjZjNGFjMzk1MWQ3Njg2MDZhZmIzZDAudHRm/U1BFQ1RSRQ/pixeldraw.png?r=fs&h=120&w=2000&fg=00F0FF&tb=1&s=120" 
            alt="Spectre" 
            style={{ height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 0 15px rgba(0,240,255,0.5))' }}
          />
        </h1>
        <h2 className="hero-subtitle">
          {'>'} Learn to break systems {'!'}{'!'}
        </h2>
<p className="hero-date"><LiveDateTime /></p>

        <div className="hero-ctas">
          <Link to="/dashboard" className="btn btn-primary">
            Enter Arena <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="btn btn-outline">
            Sign Up
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <Terminal size={32} className="stat-icon" />
            <div className="stat-number">
              {animChallenges}
              {statsLoaded && <span className="stat-live-dot" title="Live data" />}
            </div>
            <div className="stat-label">Challenges</div>
          </div>
          <div className="stat-card">
            <Users size={32} className="stat-icon" />
            <div className="stat-number">
              {animPlayers}
              {statsLoaded && <span className="stat-live-dot" title="Live data" />}
            </div>
            <div className="stat-label">Players</div>
          </div>
          <div className="stat-card">
            <Layers size={32} className="stat-icon" />
            <div className="stat-number">
              {animTracks}
              {statsLoaded && <span className="stat-live-dot" title="Live data" />}
            </div>
            <div className="stat-label">Tracks</div>
          </div>
          <div className="stat-card">
            <FileText size={32} className="stat-icon" />
            <div className="stat-number">
              {animWriteups}
              {statsLoaded && <span className="stat-live-dot" title="Live data" />}
            </div>
            <div className="stat-label">Writeups</div>
          </div>
        </div>

      </main>

      {/* Footer Section */}
      <footer className="landing-footer">
        <div className="footer-left">
          <div className="footer-title">Spectre</div>
          <div className="footer-subtitle">The Cyber Security Club of IIT Bhilai</div>
        </div>
        <div className="footer-center">
          <div className="footer-email">
            <Mail size={16} /> <a href="mailto:spectre@iitbhilai.ac.in" style={{color: 'inherit', textDecoration: 'none'}}>spectre@iitbhilai.ac.in</a>
          </div>
          <div className="footer-credit">
            Made with <span style={{ color: '#ef4444' }}>❤</span> by Rahul
          </div>
          <div className="footer-copyright">
            © 2026 Spectre, IIT Bhilai. All rights reserved.
          </div>
        </div>
        <div className="footer-right">
          <a href="https://github.com/spectreIIT" target="_blank" rel="noopener noreferrer" className="social-link"><Github size={20} /></a>
          <a href="https://discord.gg/7pzr7fPJe" target="_blank" rel="noopener noreferrer" className="social-link"><Discord size={20} /></a>
          <a href="https://www.linkedin.com/company/spectre-iit-bhilai/" target="_blank" rel="noopener noreferrer" className="social-link"><Linkedin size={20} /></a>
          <a href="https://www.instagram.com/spectre_iitbhilai?igsh=MWNxdHUyY2xueDJlMw==" target="_blank" rel="noopener noreferrer" className="social-link"><Instagram size={20} /></a>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
