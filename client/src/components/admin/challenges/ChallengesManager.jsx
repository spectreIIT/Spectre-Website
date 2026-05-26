import { useState, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAdminChallenges } from '../../../hooks/useAdminChallenges';
import ChallengeList from './ChallengeList';
import ChallengeForm from './ChallengeForm';
import SolveTracker from './SolveTracker';
import AuthContext from '../../../context/AuthContext';
import { Plus, Search, Filter } from 'lucide-react';
import '../../../styles/pages/Dashboard.css';

export default function ChallengesManager({ eventId = null }) {
  const { challenges, loading, error, handleCreate, handleUpdate, handleDelete } = useAdminChallenges(eventId);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useContext(AuthContext);
  
  const view = searchParams.get('cView') || 'list';
  const activeChallengeId = searchParams.get('cId');
  const activeChallenge = activeChallengeId ? challenges.find(c => c._id === activeChallengeId) : null;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ownerFilter, setOwnerFilter] = useState('All'); // 'All', 'Mine'

  // Dynamic lists from real challenges
  const categories = ['All', ...new Set(challenges.map(c => c.category).filter(Boolean))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard', 'Advanced', 'Expert'];
  const statuses = ['All', 'active', 'hidden', 'draft'];

  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.category.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'All' || c.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || (c.status || 'draft').toLowerCase() === statusFilter.toLowerCase();
    const matchesOwner = ownerFilter === 'All' || (c.createdBy?._id === user?._id || c.createdBy === user?._id);
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesStatus && matchesOwner;
  });

  const setViewParams = (newView, challengeId = null) => {
    const params = new URLSearchParams(searchParams);
    if (newView === 'list') {
      params.delete('cView');
      params.delete('cId');
    } else {
      params.set('cView', newView);
      if (challengeId) params.set('cId', challengeId);
      else params.delete('cId');
    }
    setSearchParams(params);
  };

  const openCreate = () => setViewParams('create');
  const openEdit = (challenge) => setViewParams('edit', challenge._id);
  const openSolves = (challenge) => setViewParams('solves', challenge._id);
  const closeView = () => setViewParams('list');

  if (loading) {
    return <div style={{ color: '#94a3b8', padding: '20px' }}>Loading challenges...</div>;
  }

  if (error) {
    return <div style={{ color: '#ef4444', padding: '20px' }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {view === 'list' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  placeholder="Search challenges..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 12px 10px 36px', borderRadius: '8px' }}
                />
              </div>
              {!eventId && (
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: showFilters ? 'rgba(168,85,247,0.15)' : 'transparent', 
                  border: showFilters ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.1)', 
                  color: showFilters ? '#a855f7' : '#94a3b8', 
                  padding: '10px 16px', 
                  borderRadius: '8px', 
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Filter size={16} /> Filter
              </button>
              )}
            </div>
            <button 
              onClick={openCreate}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#a855f7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}
            >
              <Plus size={16} /> New Challenge
            </button>
          </div>

          {showFilters && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', backgroundColor: '#16181f', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginTop: '4px', marginBottom: '8px', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Difficulty</label>
                <select 
                  value={difficultyFilter} 
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
                >
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
                >
                  {statuses.map(st => (
                    <option key={st} value={st}>{st === 'All' ? st : st.charAt(0).toUpperCase() + st.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '130px' }}>
                <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Creator</label>
                <select 
                  value={ownerFilter} 
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', outline: 'none', fontSize: '0.8rem' }}
                >
                  <option value="All">All Creators</option>
                  <option value="Mine">My Challenges</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', minWidth: '80px' }}>
                <button 
                  onClick={() => { setCategoryFilter('All'); setDifficultyFilter('All'); setStatusFilter('All'); setOwnerFilter('All'); }}
                  style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', width: '100%', height: '36px', transition: 'all 0.2s', fontSize: '0.8rem' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
          
          <ChallengeList 
            challenges={filteredChallenges} 
            onEdit={openEdit} 
            onDelete={handleDelete}
            onViewSolves={openSolves}
          />
        </>
      )}

      {(view === 'create' || view === 'edit') && (
        <ChallengeForm 
          challenge={activeChallenge} 
          onSave={view === 'create' ? handleCreate : (data) => handleUpdate(activeChallenge._id, data)}
          onCancel={closeView}
          onDelete={handleDelete}
        />
      )}

      {view === 'solves' && (
        <SolveTracker 
          challenge={activeChallenge} 
          onCancel={closeView} 
        />
      )}
    </div>
  );
}
