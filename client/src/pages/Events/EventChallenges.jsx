import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useEvent } from '../../context/EventContext';
import ChallengesManager from '../../components/admin/challenges/ChallengesManager';
import ChallengeCard from '../../components/cards/ChallengeCard';
import ChallengeModal from '../../components/modals/ChallengeModal';
import WriteupCreate from '../Writeups/WriteupCreate';
import { Filter, Search, RotateCcw, XCircle, ChevronDown, ChevronUp, PenTool } from 'lucide-react';
import API_URL from '../../constants/api';
import './EventChallenges.css';

export default function EventChallenges() {
  const { event, isAdminOrSupervisor } = useEvent();
  const location = useLocation();
  const isAdminView = location.pathname.includes('/admin/events');
  const isSupervisorView = location.pathname.includes('/supervisor/events');
  const isPrivilegedView = isAdminView || isSupervisorView;

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [isCreatingWriteup, setIsCreatingWriteup] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState('All');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  useEffect(() => {
    if (isAdminOrSupervisor && isPrivilegedView) return; // We use the ChallengesManager for admins/supervisors

    const fetchChallenges = async () => {
      try {
        const token = localStorage.getItem('token');
        const url = isPrivilegedView 
          ? `${API_URL}/api/events/${event._id}/challenges`
          : `${API_URL}/api/events/${event._id}/challenges?arena=true`;
          
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch event challenges');
        const data = await res.json();
        setChallenges(data);
      } catch (err) {
        console.error('Error fetching event challenges:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, [event._id, isAdminOrSupervisor, isPrivilegedView]);

  if (isAdminOrSupervisor && isPrivilegedView) {
    return (
      <div className="event-challenges-admin">
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: '#fff' }}>Challenge Management</h2>
          <p style={{ color: '#94a3b8', margin: '4px 0 0 0' }}>Manage challenges scoped exclusively to {event.title}.</p>
        </div>
        <ChallengesManager eventId={event._id} />
      </div>
    );
  }

  const handleSolve = (challengeId, isNewSolve = true) => {
    setChallenges(prev => prev.map(c => 
      (c._id === challengeId || c.id === challengeId) ? { ...c, isSolved: true, solves: (c.solves || 0) + (isNewSolve ? 1 : 0) } : c
    ));
  };

  const handleReset = () => {
    setSearchQuery('');
    setDifficultyFilter('All');
    setSolvedFilter('All');
  };

  const toggleCategory = (category) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filtering
  const safeChallenges = Array.isArray(challenges) ? challenges : [];
  const filteredChallenges = safeChallenges.filter(c => {
    const title = c.title || '';
    const category = c.category || '';
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || c.difficulty === difficultyFilter;
    let matchesSolvedStatus = true;
    if (solvedFilter === 'Solved') matchesSolvedStatus = c.isSolved === true;
    else if (solvedFilter === 'Unsolved') matchesSolvedStatus = !c.isSolved;
    
    return matchesSearch && matchesDifficulty && matchesSolvedStatus;
  });

  // Grouping by category
  const groupedChallenges = filteredChallenges.reduce((acc, challenge) => {
    const category = challenge.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(challenge);
    return acc;
  }, {});

  const isFiltered = searchQuery !== '' || difficultyFilter !== 'All' || solvedFilter !== 'All';

  const isEventStarted = new Date(event.startDate) <= new Date();

  if (loading) {
    return (
      <div className="event-challenges-loading">
        <div className="event-spinner"></div>
        <p>Loading Competition Grid...</p>
      </div>
    );
  }

  // Check if writeup submissions are open
  const now = new Date();
  const writeupsStart = event.writeupsStart ? new Date(event.writeupsStart) : null;
  const writeupsEnd = event.writeupsEnd ? new Date(event.writeupsEnd) : null;
  
  const isParticipant = !isPrivilegedView && event.isRegistered;
  
  const isSubmissionOpen = event.allowWriteups && 
                           (!writeupsStart || now >= writeupsStart) && 
                           (!writeupsEnd || now <= writeupsEnd) &&
                           isParticipant;
                           
  const isSubmissionOver = event.allowWriteups && writeupsEnd && now > writeupsEnd && isParticipant;

  if (isCreatingWriteup) {
    return (
      <div style={{ padding: '24px' }}>
        <WriteupCreate 
          eventId={event._id} 
          onSuccess={() => {
            setIsCreatingWriteup(false);
          }}
          onCancel={() => setIsCreatingWriteup(false)}
        />
      </div>
    );
  }

  return (
    <div className="event-challenges-page">
      <div className="ec-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1>{event.title} Arena</h1>
            <p>Solve challenges to earn points on the scoreboard.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            {isSubmissionOpen && (
              <button 
                onClick={() => setIsCreatingWriteup(true)} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#a855f7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#9333ea'}
                onMouseOut={(e) => e.currentTarget.style.background = '#a855f7'}
              >
                <PenTool size={18} /> Submit Writeup
              </button>
            )}
            {isSubmissionOver && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                Writeup submission time is over.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="ec-filters">
        <div className="ec-search-box">
          <Search size={18} color="#94a3b8" />
          <input 
            type="text" 
            placeholder="Search challenges..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>
              <XCircle size={16} />
            </button>
          )}
        </div>

        <div className="ec-dropdowns">
          <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>

          <select value={solvedFilter} onChange={(e) => setSolvedFilter(e.target.value)}>
            <option value="All">All Status</option>
            <option value="Solved">Solved</option>
            <option value="Unsolved">Unsolved</option>
          </select>

          {isFiltered && (
            <button className="ec-reset-btn" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="ec-grid-container">
        {!isEventStarted ? (
          <div className="ec-empty">
            <Filter size={48} />
            <h3>Event Not Started</h3>
            <p>The challenges will be revealed when the event officially begins.</p>
          </div>
        ) : Object.keys(groupedChallenges).length === 0 ? (
          <div className="ec-empty">
            <Filter size={48} />
            <h3>No Challenges Found</h3>
            <p>Try adjusting your filters or search query.</p>
          </div>
        ) : (
          Object.keys(groupedChallenges).sort().map(category => {
            const catChallenges = groupedChallenges[category];
            const solvedCount = catChallenges.filter(c => c.isSolved).length;
            const totalCount = catChallenges.length;
            const isCollapsed = collapsedCategories[category];

            return (
              <div key={category} className="ec-category-group">
                <div className="ec-category-header" onClick={() => toggleCategory(category)}>
                  <div className="ec-category-title">
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    <h2>{category}</h2>
                    <span className="ec-category-count">
                      {solvedCount} / {totalCount} Solved
                    </span>
                  </div>
                  <div className="ec-category-line"></div>
                </div>

                {!isCollapsed && (
                  <div className="ec-cards-grid">
                    {catChallenges.map(challenge => (
                      <ChallengeCard 
                        key={challenge._id || challenge.id} 
                        chal={challenge} 
                        onClick={() => setSelectedChallenge(challenge)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedChallenge && (
        <ChallengeModal 
          challenge={selectedChallenge} 
          onClose={() => setSelectedChallenge(null)}
          onSolve={handleSolve}
          eventId={event._id}
        />
      )}
    </div>
  );
}
