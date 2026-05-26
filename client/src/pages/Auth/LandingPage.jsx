import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Trophy, Users, Layers, FileText, ArrowRight, LogIn, Mail } from 'lucide-react';
import GlitchLogo from '../../components/ui/GlitchLogo';
import '../../styles/pages/LandingPage.css';

const Github = ({ size = 24, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.8 4.8 0 0 0 8 18v4"></path>
    <path d="M9 18c-4.51 2-5-2-7-2"></path>
  </svg>
);

const Linkedin = ({ size = 24, color = "currentColor", ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
    <rect x="2" y="9" width="4" height="12"></rect>
    <circle cx="4" cy="4" r="2"></circle>
  </svg>
);

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
          {'>'} Hack. Exploit. Capture the Flag.
        </h2>
        <p className="hero-date">Season 4 &bull; April 15-17, 2026</p>

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
    </div>
  );
}

export default LandingPage;
