import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Search, Filter, Star, Clock, Eye, AlertCircle, Award, BookOpen, User, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

function ReviewPanel({ eventId = null }) {
  const { user } = useAuth();
  const [writeups, setWriteups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('newest');

  // Modal State
  const [selectedWriteup, setSelectedWriteup] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Approved');
  const [reviewPoints, setReviewPoints] = useState(50);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Custom Toasts and Confirm Modal State
  const [toasts, setToasts] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [writeupToDelete, setWriteupToDelete] = useState(null);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      const url = new URL(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/review/pending`);
      url.searchParams.append('status', filterStatus);
      url.searchParams.append('sort', sortOrder);
      if (eventId) {
        url.searchParams.append('eventId', eventId);
      }

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWriteups(data);
      }
    } catch (err) {
      console.error('Error fetching review writeups:', err);
      showToast('Failed to fetch writeups', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, [filterStatus, sortOrder]);

  const openReviewModal = (w) => {
    setSelectedWriteup(w);
    const initialStatus = (w.status || '').toLowerCase();
    setReviewStatus(initialStatus === 'pending review' || initialStatus === 'pending' ? 'approved' : initialStatus);
    setReviewPoints(w.pointsAwarded || 50);
    setReviewRemarks(w.reviewRemarks || '');
    setIsFeatured(w.featured || false);
  };

  const triggerReviewAction = (status) => {
    setReviewStatus(status);
    setShowConfirmModal(true);
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    setShowConfirmModal(true);
  };

  const executeReviewSubmit = async () => {
    if (!selectedWriteup) return;
    setActionLoading(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/review/${selectedWriteup._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: reviewStatus,
          points: reviewPoints,
          reviewRemarks,
          featured: isFeatured
        })
      });

      if (res.ok) {
        const updated = await res.json();
        showToast(`Writeup successfully updated to ${updated.status}! Points awarded: ${updated.pointsAwarded}.`, 'success');
        setWriteups(prev => prev.map(w => w._id === updated._id ? updated : w));
        setSelectedWriteup(null);
      } else {
        const errData = await res.json();
        showToast(errData.message || 'Failed to process review', 'error');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      showToast('Server error processing review', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const triggerDelete = (w) => {
    setWriteupToDelete(w);
    setShowDeleteConfirmModal(true);
  };

  const executeDelete = async () => {
    if (!writeupToDelete) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${writeupToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        showToast('Writeup deleted successfully', 'success');
        setWriteups(prev => prev.filter(w => w._id !== writeupToDelete._id));
      } else {
        const data = await res.json();
        showToast(data.message || 'Failed to delete writeup', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Server error deleting writeup', 'error');
    } finally {
      setShowDeleteConfirmModal(false);
      setWriteupToDelete(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    const commonBadgeStyle = {
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      display: 'inline-block'
    };
    switch (s) {
      case 'approved':
      case 'published':
        return <span style={{ ...commonBadgeStyle, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>Approved</span>;
      case 'pending review':
      case 'pending':
        return <span style={{ ...commonBadgeStyle, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>Pending Review</span>;
      case 'rejected':
        return <span style={{ ...commonBadgeStyle, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>Rejected</span>;
      case 'under_review':
      case 'under review':
        return <span style={{ ...commonBadgeStyle, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>Under Review</span>;
      default:
        return <span style={{ ...commonBadgeStyle, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }}>{status}</span>;
    }
  };

  return (
    <div style={{ color: '#fff', marginBottom: '48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={22} color="#a855f7" /> Writeup Review Panel
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Evaluate submissions, assign custom points, and maintain quality standards.</p>
        </div>

        {/* Filters & Sorting */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#090a0f', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '0 10px', gap: '6px' }}>
            <Filter size={12} color="#a855f7" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 2px', fontSize: '0.78rem', fontWeight: 600, outline: 'none', cursor: 'pointer', width: '120px' }}
            >
              <option value="ALL" style={{ background: '#090a0f' }}>All Statuses</option>
              <option value="Pending Review" style={{ background: '#090a0f' }}>Pending Review</option>
              <option value="Approved" style={{ background: '#090a0f' }}>Approved</option>
              <option value="Rejected" style={{ background: '#090a0f' }}>Rejected</option>
              <option value="Under Review" style={{ background: '#090a0f' }}>Under Review</option>
              <option value="Draft" style={{ background: '#090a0f' }}>Draft</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', background: '#090a0f', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '8px', padding: '0 10px', gap: '6px' }}>
            <Clock size={12} color="#a855f7" />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '8px 2px', fontSize: '0.78rem', fontWeight: 600, outline: 'none', cursor: 'pointer', width: '110px' }}
            >
              <option value="newest" style={{ background: '#090a0f' }}>Newest First</option>
              <option value="oldest" style={{ background: '#090a0f' }}>Oldest First</option>
              <option value="highest_points" style={{ background: '#090a0f' }}>Highest Points</option>
              <option value="lowest_points" style={{ background: '#090a0f' }}>Lowest Points</option>
            </select>
          </div>

          <button
            onClick={fetchPendingReviews}
            style={{ background: '#12141a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600 }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#12141a', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: '#94a3b8', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '12px 16px' }}>Title</th>
              <th style={{ padding: '12px 16px' }}>Challenge</th>
              <th style={{ padding: '12px 16px' }}>Author</th>
              <th style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ padding: '12px 16px' }}>Points</th>
              <th style={{ padding: '12px 16px' }}>Reviewed By</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>Analyzing submissions...</td>
              </tr>
            ) : writeups.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>No writeups match your filter criteria.</td>
              </tr>
            ) : (
              writeups.map(w => (
                <tr key={w._id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#fff', fontSize: '0.8rem' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {w.featured && <Star size={12} color="#fbbf24" fill="#fbbf24" />}
                    <a
                      href={eventId ? `/${user?.role === 'Admin' ? 'admin' : 'supervisor'}/events/${eventId}/writeups/${w._id}` : `/writeups/${w._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#00f0ff',
                        textDecoration: 'none',
                        transition: 'color 0.2s',
                        fontWeight: 600
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#a855f7'}
                      onMouseLeave={e => e.currentTarget.style.color = '#00f0ff'}
                    >
                      {w.title}
                    </a>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#a855f7', fontWeight: 600 }}>{w.challengeName}</td>
                  <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{w.author?.username || 'Unknown'}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{getStatusBadge(w.status)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: w.pointsAwarded > 0 ? '#10b981' : '#94a3b8' }}>{w.pointsAwarded || 0} pts</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '0.78rem' }}>{w.reviewedBy?.username || '—'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => openReviewModal(w)}
                        style={{
                          background: (w.status === 'Pending Review' || w.status === 'pending') ? '#ec4899' : '#1e212b',
                          border: (w.status === 'Pending Review' || w.status === 'pending') ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Eye size={12} /> {(w.status === 'Pending Review' || w.status === 'pending') ? 'Evaluate' : 'Review'}
                      </button>
                      {user?.role === 'Admin' && (
                        <button
                          onClick={() => triggerDelete(w)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#ef4444',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedWriteup && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
          <div style={{ backgroundColor: '#16181f', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(168, 85, 247, 0.3)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '24px' }}>
              <div>
                <span style={{ color: '#a855f7', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Evaluating Submission</span>
                <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedWriteup.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedWriteup(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer', padding: '4px' }}
              >
                ×
              </button>
            </div>

            {/* Basic Info */}
            <div style={{ background: '#0e1015', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#cbd5e1', flexWrap: 'wrap' }}>
                <span><strong>Challenge:</strong> <span style={{ color: '#a855f7' }}>{selectedWriteup.challengeName}</span></span>
                <span><strong>Author:</strong> <span style={{ color: '#fff' }}>{selectedWriteup.author?.username || 'Unknown'}</span></span>
              </div>
            </div>

            {/* Review Form */}
            <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div>
                {/* Points Assignment */}
                <div>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Assign Custom Points</label>
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    value={reviewPoints}
                    onChange={(e) => setReviewPoints(e.target.value)}
                    style={{ width: '100%', background: '#12141a', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '12px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: 700 }}
                    required
                  />
                  <span style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Flexible reward based on submission quality.</span>
                </div>
              </div>

              {/* Remarks / Feedback */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Review Remarks / Feedback (Optional)</label>
                <textarea
                  placeholder="Provide feedback or explain why points/status were assigned..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  rows={3}
                  style={{ width: '100%', background: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', resize: 'vertical', fontSize: '0.9rem' }}
                />
              </div>

              {/* Reviewer History */}
              {selectedWriteup.reviewerHistory && selectedWriteup.reviewerHistory.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '8px' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review & Audit History</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                    {selectedWriteup.reviewerHistory.map((h, i) => (
                      <div key={i} style={{ background: '#0e1015', padding: '10px 14px', borderRadius: '6px', borderLeft: '3px solid #a855f7', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#cbd5e1' }}>
                          <span><strong>{h.reviewerName || 'Admin'}</strong> ({h.reviewerRole || 'Reviewer'}) changed status to <strong>{h.action}</strong></span>
                          <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(h.date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem' }}>
                          <span>Remarks: {h.remarks || 'None'}</span>
                          <span style={{ color: '#10b981', fontWeight: 600 }}>{h.points || 0} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedWriteup(null)}
                  style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '8px 12px', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => triggerReviewAction('rejected')}
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }}
                  onMouseOver={(e) => { if (!actionLoading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                  onMouseOut={(e) => { if (!actionLoading) e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                >
                  Reject Submission
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => triggerReviewAction('approved')}
                  style={{ background: '#ec4899', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {actionLoading ? 'Processing...' : 'Publish & Award Points'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Review Confirmation Modal Overlay */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10500, padding: '20px' }}>
          <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '16px', padding: '28px', maxWidth: '450px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.9), 0 0 30px rgba(168, 85, 247, 0.15)', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <CheckCircle size={36} color="#a855f7" />
              </div>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '800', margin: '0 0 8px 0' }}>
                {reviewStatus === 'approved' ? 'Confirm Approval & Publishing' : 'Confirm Submission Rejection'}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Are you sure you want to proceed with this action?
              </p>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: '#94a3b8' }}>Action: <span style={{ color: reviewStatus === 'approved' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                  {reviewStatus === 'approved' ? 'Approve & Publish' : 'Reject Submission'}
                </span></div>
                {reviewStatus === 'approved' && (
                  <div style={{ color: '#94a3b8' }}>Points Awarded: <span style={{ color: '#10b981', fontWeight: 600 }}>{reviewPoints} PTS</span></div>
                )}
                {reviewRemarks && (
                  <div style={{ color: '#94a3b8' }}>Remarks: <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>"{reviewRemarks}"</span></div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeReviewSubmit}
                style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(168,85,247,0.2)', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(168,85,247,0.2)'; }}
              >
                Confirm & Notify Author
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirmModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10500, padding: '20px' }}>
          <div style={{ backgroundColor: '#12141a', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '16px', padding: '28px', maxWidth: '450px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.9), 0 0 30px rgba(239, 68, 68, 0.15)', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertCircle size={36} color="#ef4444" />
              </div>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '800', margin: '0 0 8px 0' }}>
                Confirm Writeup Deletion
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Are you sure you want to permanently delete this writeup? This action cannot be undone and will revoke any points awarded.
              </p>
              {writeupToDelete && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ color: '#94a3b8' }}>Title: <span style={{ color: '#fff', fontWeight: 600 }}>{writeupToDelete.title}</span></div>
                  <div style={{ color: '#94a3b8' }}>Challenge: <span style={{ color: '#a855f7', fontWeight: 600 }}>{writeupToDelete.challengeName}</span></div>
                  <div style={{ color: '#94a3b8' }}>Author: <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{writeupToDelete.author?.username || 'Unknown'}</span></div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => { setShowDeleteConfirmModal(false); setWriteupToDelete(null); }}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '8px 16px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.2)'; }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 11000, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600',
            fontSize: '0.9rem',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '✓'} {t.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

    </div>
  );
}

export default ReviewPanel;
