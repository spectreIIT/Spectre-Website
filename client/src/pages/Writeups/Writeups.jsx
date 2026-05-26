import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Plus, ArrowRight, BookOpen, Search, Heart, Sparkles, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { useSearch } from '../../context/SearchContext';
import '../../styles/pages/Writeups.css';

function Writeups() {
  const [writeups, setWriteups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { searchQuery } = useSearch();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Filter State
  const [sortOrder, setSortOrder] = useState('RECENT'); // 'RECENT', 'OLD', 'UPVOTES'

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

  // ── Compute Top 5 Users based on Upvotes ──
  const top5Contributors = useMemo(() => {
    if (!writeups || writeups.length === 0) return [];

    const stats = {};
    writeups.forEach(w => {
      const authorId = w.author?._id;
      if (!authorId) return;

      const username = w.author?.username || 'Unknown';
      const upvotes = w.upvotes || 0;

      if (!stats[authorId]) {
        stats[authorId] = {
          _id: authorId,
          username,
          avatarUrl: w.author?.avatarUrl,
          totalUpvotes: 0,
          writeupsCount: 0
        };
      }
      stats[authorId].totalUpvotes += upvotes;
      stats[authorId].writeupsCount += 1;
    });

    return Object.values(stats)
      .sort((a, b) => b.totalUpvotes - a.totalUpvotes)
      .slice(0, 5);
  }, [writeups]);

  // ── Multi-criteria Filtering & Sorting ──
  const processedWriteups = useMemo(() => {
    let result = [...writeups];

    // 1. Search Query filter (from SearchContext)
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      result = result.filter(w => {
        const titleMatch = (w.title || '').toLowerCase().includes(term);
        const authorMatch = (w.author?.username || '').toLowerCase().includes(term);
        const challengeMatch = (w.challengeName || '').toLowerCase().includes(term);
        return titleMatch || authorMatch || challengeMatch;
      });
    }

    // 2. Sort Order
    result.sort((a, b) => {
      if (sortOrder === 'RECENT') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      } else if (sortOrder === 'OLD') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      } else if (sortOrder === 'UPVOTES') {
        return (b.upvotes || 0) - (a.upvotes || 0);
      }
      return 0;
    });

    return result;
  }, [writeups, searchQuery, sortOrder]);

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortOrder]);

  const totalPages = Math.ceil(processedWriteups.length / ITEMS_PER_PAGE);
  const currentWriteups = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedWriteups.slice(start, start + ITEMS_PER_PAGE);
  }, [processedWriteups, currentPage]);

  return (
    <div className="writeups-container">
      {/* Page Header */}
      <div className="writeups-header">
        <div className="writeups-title">
          <h1>Writeups</h1>
        </div>
        <button className="submit-btn" onClick={() => navigate('/writeups/new')}>
          <Plus size={18} /> Submit Writeup
        </button>
      </div>

      {/* Top Writers section placed at the top */}
      {top5Contributors.length > 0 && (
        <div className="top-writers-section">
          <h3 className="top-writers-section-title">
            <Sparkles size={16} color="#fbbf24" style={{ marginRight: '6px' }} /> Top Writers
          </h3>
          <div className="top-writers-list-horizontal">
            {top5Contributors.map((c, idx) => (
              <div key={c._id} className="top-writer-card-horizontal">
                <div className="top-writer-rank-badge">#{idx + 1}</div>
                <div className="top-writer-avatar-large">
                  {c.avatarUrl ? (
                    <img
                      src={c.avatarUrl}
                      alt={c.username}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span style={{ display: c.avatarUrl ? 'none' : 'flex' }}>
                    {c.username.charAt(0)}
                  </span>
                </div>
                <div className="top-writer-info-large">
                  <div className="top-writer-username">{c.username}</div>
                  <div className="top-writer-meta-row">
                    <span className="top-writer-meta-item"><BookOpen size={12} /> {c.writeupsCount} Reports</span>
                    <span className="top-writer-meta-item color-purple"><Heart size={12} fill="#a855f7" style={{ color: '#a855f7' }} /> {c.totalUpvotes} Upvotes</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simple Button for User's Own Writeups */}
      {user && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '16px 0 8px 0' }}>
          <button
            onClick={() => navigate('/writeups/my')}
            style={{
              background: '#12141a',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'border-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#a855f7'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'}
          >
            <BookOpen size={16} color="#a855f7" /> My Reports <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Main Layout */}
      <div className="writeups-layout">

        {/* Main content block */}
        <div className="writeups-main">

          {/* Minimal Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#090a0f', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '6px', padding: '0 12px', gap: '8px' }}>
              <Filter size={14} color="#a855f7" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 4px', fontSize: '0.85rem', fontWeight: 600, outline: 'none', cursor: 'pointer' }}
              >
                <option value="RECENT" style={{ background: '#090a0f', color: '#fff' }}>Recent</option>
                <option value="OLD" style={{ background: '#090a0f', color: '#fff' }}>Oldest</option>
                <option value="UPVOTES" style={{ background: '#090a0f', color: '#fff' }}>Most Upvotes</option>
              </select>
            </div>
          </div>

          {/* Writeups Grid Display */}
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Analyzing databases...</p>
          ) : processedWriteups.length === 0 ? (
            <div style={{ backgroundColor: '#12141a', padding: '40px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', border: '1px dashed rgba(255,255,255,0.06)' }}>
              No active writeups found matching your filter criteria.
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

export default Writeups;
