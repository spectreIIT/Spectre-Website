import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Plus, ArrowRight, BookOpen, ChevronLeft, Heart, Sparkles, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import '../../styles/pages/Writeups.css';

function MyWriteups() {
  const [writeups, setWriteups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery } = useSearch();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Fetch writeups from API
  const fetchWriteups = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setWriteups(data);
      }
    } catch (error) {
      console.error('Error fetching writeups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWriteups();
  }, []);

  const getTimeAgo = (dateStr) => {
    const days = Math.floor((new Date() - new Date(dateStr)) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  // Filter writeups to ONLY include user's own writeups
  const myOwnWriteups = useMemo(() => {
    if (!user || !writeups) return [];
    return writeups.filter(w => w.author?._id === user._id);
  }, [writeups, user]);

  // Multi-criteria Filtering (Search Query only)
  const processedWriteups = useMemo(() => {
    let result = [...myOwnWriteups];

    // 1. Search Query filter
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(w => {
        const titleMatch = (w.title || '').toLowerCase().includes(term);
        const challengeMatch = (w.challengeName || '').toLowerCase().includes(term);
        return titleMatch || challengeMatch;
      });
    }

    // Default sort by recent
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return result;
  }, [myOwnWriteups, searchQuery]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(processedWriteups.length / ITEMS_PER_PAGE);
  const currentWriteups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedWriteups.slice(start, start + ITEMS_PER_PAGE);
  }, [processedWriteups, currentPage]);

  return (
    <div className="writeups-container">
      {/* Top Navigation Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => navigate('/writeups')} 
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#a855f7'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
        >
          <ChevronLeft size={18} /> Back to Catalog
        </button>
      </div>

      {/* Page Header */}
      <div className="writeups-header">
        <div className="writeups-title">
          <h1>My Intel Reports</h1>
        </div>
        <button className="submit-btn" onClick={() => navigate('/writeups/new')}>
          <Plus size={18} /> Submit Writeup
        </button>
      </div>

      {/* Main Layout */}
      <div className="writeups-layout">
        <div className="writeups-main">
          
          {/* Section Header without Filter Bar */}
          <div className="section-header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: '#12141a', padding: '20px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={20} color="#a855f7" />
              My Operational Reports ({myOwnWriteups.length})
            </h2>
          </div>
          
          {/* Writeups Grid Display */}
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Analyzing databases...</p>
          ) : processedWriteups.length === 0 ? (
            <div style={{ backgroundColor: '#12141a', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.06)' }}>
              📂 No writeups found matching your author credentials. Click "Submit Writeup" to record your first operational report!
            </div>
          ) : (
            <>
              <div className="writeup-grid">
                {currentWriteups.map(w => (
                  <div key={w._id} className="writeup-card" onClick={() => navigate(`/writeups/${w._id}`)} style={{ cursor: 'pointer' }}>
                    <div className="writeup-badges">
                      {w.featured && (
                        <span className="writeup-badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>★ Featured</span>
                      )}
                      {(w.status === 'pending' || w.status === 'Pending Review') && (
                        <span className="writeup-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>⏳ Pending Review</span>
                      )}
                      {(w.status === 'Draft' || w.status === 'draft') && (
                        <span className="writeup-badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }}>📝 Draft</span>
                      )}
                      {(w.status === 'rejected' || w.status === 'Rejected') && (
                        <span className="writeup-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>❌ Rejected</span>
                      )}
                      {(w.status === 'under_review' || w.status === 'under review') && (
                        <span className="writeup-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>🔍 Under Review</span>
                      )}
                      {w.tags && w.tags.map((tag, i) => (
                        <span key={i} className="writeup-badge badge-tag">{tag}</span>
                      ))}
                    </div>
                    
                    <h3 className="writeup-title">{w.title}</h3>
                    <div className="writeup-author">By {w.author?.username || 'Unknown'}</div>
                    
                    <div className="writeup-meta">
                      <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{w.upvotes || 0} Upvotes</span>
                      <span><BookOpen size={14} /> {w.challengeName}</span>
                    </div>
                    
                    <div className="writeup-footer">
                      <span className="writeup-time">{getTimeAgo(w.createdAt)}</span>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="writeup-action-btn btn-solve">
                          Read <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

        </div>
      </div>
    </div>
  );
}

export default MyWriteups;
