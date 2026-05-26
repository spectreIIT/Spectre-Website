import React, { useState, useEffect } from 'react';
import { ChevronDown, Filter, XCircle, RotateCcw } from 'lucide-react';
import ChallengeCard from '../../components/cards/ChallengeCard';
import ChallengeModal from '../../components/modals/ChallengeModal';
import { getChallenges } from '../../services/challengeService';
import { useSearch } from '../../context/SearchContext';
import '../../styles/pages/Challenges.css';

function Challenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  
  // Filters
  const { searchQuery, setSearchQuery } = useSearch();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [solvedFilter, setSolvedFilter] = useState('All'); // 'All', 'Solved', 'Unsolved'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Reset page when any filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, difficultyFilter, solvedFilter]);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const data = await getChallenges();
        setChallenges(data);
      } catch (err) {
        console.error('Failed to fetch challenges', err);
        setChallenges([
          { _id: '1', title: 'Undo', category: 'General Skills', difficulty: 'Easy', points: 100, solves: 11039, description: 'Reverse Linux transformations.' },
          { _id: '2', title: 'SQLi Basic', category: 'Web', difficulty: 'Easy', points: 100, solves: 450, description: 'Bypass login with SQLi.' },
          { _id: '3', title: 'Advanced Overflow', category: 'Pwn', difficulty: 'Advanced', points: 400, solves: 12, description: 'Complex stack exploitation.' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchChallenges();
  }, []);

  const handleSolve = (challengeId) => {
    setChallenges(prev => prev.map(c => 
      (c._id === challengeId || c.id === challengeId) ? { ...c, isSolved: true, solves: (c.solves || 0) + 1 } : c
    ));
  };

  const handleReset = () => {
    setSearchQuery('');
    setCategoryFilter('All');
    setDifficultyFilter('All');
    setSolvedFilter('All');
  };

  // Live filtering logic
  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || c.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'All' || c.difficulty === difficultyFilter;
    
    let matchesSolvedStatus = true;
    if (solvedFilter === 'Solved') {
      matchesSolvedStatus = c.isSolved === true;
    } else if (solvedFilter === 'Unsolved') {
      matchesSolvedStatus = !c.isSolved;
    }
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesSolvedStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredChallenges.length / ITEMS_PER_PAGE);
  const currentChallenges = filteredChallenges.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const categories = ['All', ...new Set(challenges.map(c => c.category))];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard', 'Advanced', 'Expert'];
  
  const isFiltered = searchQuery !== '' || categoryFilter !== 'All' || difficultyFilter !== 'All' || solvedFilter !== 'All';

  return (
    <div className="challenges-page">
      <div className="challenges-header-row">
        <div className="header-text">
          <h1>Active Targets</h1>
          <p>Intercept transmissions and extract critical data</p>
        </div>
      </div>

      <div className="filter-controls-row">
        <div className="dropdown-container">
          <label><Filter size={14} /> Category</label>
          <div className="select-wrapper">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="dropdown-container">
          <label><Filter size={14} /> Difficulty</label>
          <div className="select-wrapper">
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
              {difficulties.map(diff => <option key={diff} value={diff}>{diff}</option>)}
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="dropdown-container">
          <label><Filter size={14} /> Status</label>
          <div className="select-wrapper">
            <select value={solvedFilter} onChange={(e) => setSolvedFilter(e.target.value)}>
              <option value="All">All Statuses</option>
              <option value="Solved">Solved</option>
              <option value="Unsolved">Unsolved</option>
            </select>
            <ChevronDown size={14} className="select-arrow" />
          </div>
        </div>

        <div className="filter-actions-right">
          <div className="results-count">
            Showing {filteredChallenges.length} challenges
          </div>
          <button 
            className={`reset-filters-btn-permanent ${isFiltered ? 'active' : ''}`} 
            onClick={handleReset}
            disabled={!isFiltered}
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Initializing systems...</div>
      ) : (
        <>
          <div className="challenges-grid">
            {currentChallenges.length > 0 ? (
              currentChallenges.map(chal => (
                <ChallengeCard 
                  key={chal._id || chal.id} 
                  chal={chal} 
                  onClick={setSelectedChallenge}
                />
              ))
            ) : (
              <div className="no-results">
                <XCircle size={40} style={{ marginBottom: '12px', opacity: 0.2 }} />
                <p>No targets found matching your criteria.</p>
                <button onClick={handleReset} className="reset-link">Clear all filters</button>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              
              <div className="pagination-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    className={`pagination-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedChallenge && (
        <ChallengeModal 
          challenge={selectedChallenge} 
          onClose={() => setSelectedChallenge(null)} 
          onSolve={handleSolve}
        />
      )}
    </div>
  );
}

export default Challenges;
