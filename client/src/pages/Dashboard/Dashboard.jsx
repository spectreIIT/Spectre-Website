import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flag, Trophy, Flame, Globe, Lock, Cpu, Box, ArrowRight, Calendar, BookOpen, Users, Clock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getLeaderboard } from '../../services/leaderboardService';
import { moduleService } from '../../services/moduleService';
import { userService } from '../../services/userService';
import { activityService } from '../../services/activityService';
import { eventService } from '../../services/eventService';
import { getChallenges } from '../../services/challengeService';
import ChallengeCard from '../../components/cards/ChallengeCard';
import DashboardModuleCard from '../../components/cards/DashboardModuleCard';
import '../../styles/pages/Dashboard.css';

const STATIC_MODULES = [
  { id: '1', title: 'Web Security Fundamentals', icon: '🌐', color: '#00f0ff', sections: 3 },
  { id: '2', title: 'Cryptography & Encoding', icon: '🔐', color: '#b026ff', sections: 3 },
  { id: '3', title: 'Linux & Command Line', icon: '🐧', color: '#22c55e', sections: 3 },
  { id: '4', title: 'Reverse Engineering', icon: '⚙️', color: '#f59e0b', sections: 2 },
  { id: '5', title: 'Network Analysis', icon: '📡', color: '#ef4444', sections: 2 },
];

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState({ solveCount: 0, score: 0, streak: 0 });
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  const [featuredChallenges, setFeaturedChallenges] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const data = await getLeaderboard();
        const formatted = data.map((u, index) => ({
          rank: index + 1,
          name: u.username,
          points: u.score.toLocaleString(),
          avatarUrl: u.avatarUrl,
          avatar: u.username.charAt(0).toUpperCase(),
          isCurrentUser: user && user.username === u.username
        }));
        setLeaderboard(formatted.slice(0, 5));
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      }
    };



    const fetchUserStats = async () => {
      try {
        const data = await userService.getUserProfile();
        // Upgrade streak calculation to use the unified Activity Heatmap logs
        // This includes module progress, CTF solves, writeups, and event participation!
        let streak = 0;
        try {
          const heatmapData = await activityService.getHeatmap(user._id);
          const allDays = heatmapData.weeks.flat();
          
          // Grab all dates where ANY platform activity occurred
          const activeDatesArray = Array.from(new Set(
            allDays.filter(d => d.count > 0).map(d => new Date(d.date).setHours(0,0,0,0))
          )).sort((a, b) => b - a);
          
          if (activeDatesArray.length > 0) {
            const today = new Date().setHours(0,0,0,0);
            const yesterday = today - 86400000;
            
            let lastDate = activeDatesArray[0];
            
            if (lastDate === today || lastDate === yesterday) {
              streak = 1;
              for (let i = 1; i < activeDatesArray.length; i++) {
                if (activeDatesArray[i-1] - activeDatesArray[i] === 86400000) {
                  streak++;
                } else {
                  break;
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch unified streak data:", err);
        }
        
        setUserStats({
          solveCount: data.solveCount ?? 0,
          score: data.score ?? 0,
          streak,
        });
      } catch (_) { }
    };

    const fetchChallengesData = async () => {
      try {
        const data = await getChallenges();
        const activeGlobal = data.filter(c => c.status === 'active' && !c.eventId);
        activeGlobal.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        const unsolved = activeGlobal.filter(c => !c.isSolved);
        let displayChals = [...unsolved];
        if (displayChals.length < 3) {
          const solved = activeGlobal.filter(c => c.isSolved);
          displayChals = [...displayChals, ...solved];
        }
        setFeaturedChallenges(displayChals.slice(0, 3));
      } catch (_) { }
    };

    const fetchEvents = async () => {
      try {
        const data = await eventService.getUpcoming();
        const past = data.filter(e => e.lifecycleStatus === 'past');
        const upcomingOrLive = data.filter(e => e.lifecycleStatus === 'upcoming' || e.lifecycleStatus === 'active');
        
        setPastEvents(past.slice(0, 3));
        setUpcomingEvents(upcomingOrLive);
      } catch (_) { }
    };

    fetchLeaderboardData();
    fetchChallengesData();
    fetchEvents();
    if (user) fetchUserStats();
  }, [user]);

  return (
    <div className="dashboard-main-container">
      <div className="dashboard-left-col">
        {/* Welcome Section */}
        <div className="welcome-section">
          <div className="welcome-text">
            <p className="welcome-subtitle">Welcome back,</p>
            <h1 className="welcome-title">
              {user?.username || 'ByteHunter'} <span className="welcome-icon">⚡</span>
            </h1>
            <p className="welcome-desc">Ready to hack, learn and own the scoreboard?</p>
          </div>

          <div className="stats-container">
            <div className="dashboard-stat-card">
              <div className="stat-icon-wrapper green">
                <Flag size={20} color="#10b981" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{userStats.solveCount}</span>
                <span className="stat-label">Challenges<br />Solved</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-wrapper orange">
                <Trophy size={20} color="#f97316" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{userStats.score.toLocaleString()}</span>
                <span className="stat-label">Total Points</span>
              </div>
            </div>

            <div className="dashboard-stat-card">
              <div className="stat-icon-wrapper pink">
                <Flame size={20} color="#ec4899" />
              </div>
              <div className="stat-info">
                <span className="stat-value">{userStats.streak}</span>
                <span className="stat-label">Current<br />Streak</span>
              </div>
            </div>
          </div>
        </div>

        {/* Promo Event Card */}
        {upcomingEvents.length > 0 && (
          <>
            <div className="section-header">
              <h2>{upcomingEvents[0].lifecycleStatus === 'active' ? '⚡ Live Event' : '⏳ Upcoming Event'}</h2>
            </div>
            <div 
              style={{
                position: 'relative',
                borderRadius: '16px',
                padding: '36px 40px',
                marginBottom: '36px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: upcomingEvents[0].lifecycleStatus === 'active' ? '0 10px 30px rgba(16,185,129,0.1)' : '0 10px 30px rgba(0,240,255,0.05)',
                overflow: 'hidden',
                minHeight: '260px',
                gap: '24px'
              }}
            >
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${upcomingEvents[0].thumbnail || '/Illustration.png'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0
              }} />
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: upcomingEvents[0].lifecycleStatus === 'active' 
                  ? 'linear-gradient(90deg, rgba(12,20,30,1) 0%, rgba(12,20,30,0.85) 50%, rgba(16,185,129,0.25) 100%)' 
                  : 'linear-gradient(90deg, rgba(12,20,30,1) 0%, rgba(12,20,30,0.85) 50%, rgba(0,240,255,0.25) 100%)',
                zIndex: 1
              }} />

              <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 2, overflow: 'hidden' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '1.7rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{upcomingEvents[0].title}</h3>
                <p style={{ 
                  margin: 0, 
                  color: '#f8fafc', 
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>{upcomingEvents[0].description}</p>
                <div style={{ display: 'flex', gap: '24px', marginTop: '20px', fontSize: '0.9rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', gap: '16px', color: upcomingEvents[0].lifecycleStatus === 'active' ? '#34d399' : '#67e8f9' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} /> {new Date(upcomingEvents[0].startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} /> {new Date(upcomingEvents[0].startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e2e8f0' }}>
                    <Users size={14} /> {upcomingEvents[0].participantsCount} joined
                  </span>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/events/${upcomingEvents[0]._id}`)}
                style={{
                  position: 'relative', zIndex: 2,
                  flexShrink: 0,
                  background: upcomingEvents[0].lifecycleStatus === 'active' ? '#10b981' : 'rgba(0,240,255,0.1)',
                  color: upcomingEvents[0].lifecycleStatus === 'active' ? '#000' : '#00f0ff',
                  border: upcomingEvents[0].lifecycleStatus === 'active' ? 'none' : '1px solid rgba(0,240,255,0.3)',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'transform 0.2s, background 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {upcomingEvents[0].lifecycleStatus === 'active' ? 'Enter Arena' : 'View Details'}
              </button>
            </div>
          </>
        )}

        {/* Featured Challenges */}
        <div className="section-header">
          <h2>Latest Challenges</h2>
          <button onClick={() => navigate('/challenges')} className="view-all" style={{background:'none',border:'none',cursor:'pointer'}}>View All <ArrowRight size={14} /></button>
        </div>

        <div className="featured-grid">
          {featuredChallenges.map(chal => (
            <ChallengeCard key={chal._id} chal={chal} onClick={() => navigate('/challenges')} />
          ))}
        </div>


      </div>

      <div className="dashboard-right-col">
        {/* Live Leaderboard */}
        <div className="right-panel">
          <div className="section-header">
            <h2>Live Leaderboard</h2>
            <a href="/scoreboard" className="view-all">See All</a>
          </div>
          <div className="leaderboard-list">
            {leaderboard.map(player => (
              <div key={player.rank} className={`lb-item ${player.isCurrentUser ? 'current-user' : ''}`}>
                <div className="lb-rank">{player.rank}</div>
                <div className="lb-avatar" style={{ overflow: 'hidden' }}>
                  {player.avatarUrl ? <img src={player.avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : player.avatar}
                </div>
                <div className="lb-name">{player.name}</div>
                <div className={`lb-score ${player.isCurrentUser ? 'current-score' : ''}`}>
                  {player.points} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Past Events */}
        <div className="right-panel mt-4">
          <div className="section-header">
            <h2>Past Events</h2>
            <button onClick={() => navigate('/events')} className="view-all" style={{background:'none',border:'none',cursor:'pointer',fontSize:'0.8rem'}}>See All</button>
          </div>

          <div className="events-list">
            {pastEvents.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '28px 16px',
                color: '#64748b',
                textAlign: 'center',
              }}>
                <Calendar size={28} color="#334155" />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No past events yet.</p>
              </div>
            ) : (
              pastEvents.map(evt => {
                const d = new Date(evt.endDate);
                const day = d.getDate().toString().padStart(2, '0');
                const month = d.toLocaleString('default', { month: 'short' });
                const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={evt._id} className="event-card" onClick={() => navigate(`/events/${evt._id}`)}>
                    <div className="event-date">
                      <Calendar size={14} />
                      <span>{day}</span>
                    </div>
                    <div className="event-details">
                      <h4>{evt.title}</h4>
                      <p style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {day} {month} • <Clock size={12} style={{ display: 'inline', opacity: 0.8 }} /> {time}
                      </p>
                    </div>
                    <ArrowRight size={16} className="event-arrow" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
