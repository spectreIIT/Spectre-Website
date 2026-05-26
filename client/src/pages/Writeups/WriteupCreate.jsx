import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Send, Sparkles } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import Editor from '../../components/editor/Editor';

export default function WriteupCreate({ eventId = null, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('spectre_writeup_form_draft');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved form draft', e);
      }
    }
    return {
      title: '',
      challengeName: '',
      tags: '',
      description: '',
      content: ''
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Persist form draft to localStorage whenever formData changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title || formData.challengeName || formData.tags || formData.description || formData.content) {
        localStorage.setItem('spectre_writeup_form_draft', JSON.stringify(formData));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData]);

  const handleInputChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.challengeName || !formData.content) {
      setError('Please fill out all required fields.');
      return;
    }

    const tagArray = formData.tags
      ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];

    if (tagArray.length > 4) {
      setError('You can specify a maximum of 4 tags.');
      return;
    }

    setError('');
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setSubmitting(true);
    setError('');
    setShowConfirmModal(false);

    try {
      const tagArray = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          challengeName: formData.challengeName,
          tags: tagArray,
          description: formData.description,
          content: formData.content,
          eventId: eventId
        })
      });

      if (res.ok) {
        localStorage.removeItem('spectre_editor_draft');
        localStorage.removeItem('spectre_writeup_form_draft');
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = '/writeups';
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to submit writeup');
        setSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setError('Error creating writeup');
      setSubmitting(false);
    }
  };

  return (
    <div className="writeup-create-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Nav */}
      <div className="create-nav">
        <button 
          onClick={() => onCancel ? onCancel() : navigate('/writeups')} 
          className="back-link" 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.95rem', fontWeight: 600, transition: 'color 0.2s' }}
          onMouseEnter={(e) => e.target.style.color = '#a855f7'}
          onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
        >
          <ChevronLeft size={18} /> {onCancel ? 'Cancel' : 'Back to Writeups'}
        </button>
      </div>

      <div className="create-card" style={{ background: '#12141a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '32px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Sparkles size={20} color="#a855f7" style={{ filter: 'drop-shadow(0 0 6px #a855f7)' }} />
            <h1 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Create New Intel Report</h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Share your solve path with the community. Be descriptive, structure your thoughts, and utilize the splitscreen markdown editor below to build premium walkthroughs.
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Writeup Title *</label>
              <input
                type="text"
                placeholder="e.g., Kernel Panic buffer hijacking"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Challenge Target *</label>
              <input
                type="text"
                placeholder="e.g., slab-overflow-mapping"
                value={formData.challengeName}
                onChange={(e) => handleInputChange('challengeName', e.target.value)}
                style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags / Categories (Comma separated, Max 4)</label>
            <input
              type="text"
              placeholder="e.g., Pwn, Kernel, Slab"
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#a855f7'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overview / Excerpt Summary</label>
            <textarea
              placeholder="A clean, article-style breakdown of the challenge from initial reconnaissance to the final payload..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', resize: 'vertical', transition: 'all 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#a855f7'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Walkthrough Content *</label>
            <Editor
              value={formData.content}
              onChange={(val) => handleInputChange('content', val)}
              placeholder="Provide a detailed writeup of how you solved the challenge. You can load one of the preset templates in the top-right of the editor to bootstrap your walkthrough."
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => onCancel ? onCancel() : navigate('/writeups')}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', padding: '12px 28px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(168,85,247,0.15)' }}
              onMouseEnter={(e) => { e.target.style.background = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)'; }}
              onMouseLeave={(e) => { e.target.style.background = 'rgba(168,85,247,0.1)'; e.target.style.boxShadow = '0 0 15px rgba(168,85,247,0.15)'; }}
            >
              <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Intel Report'}
            </button>
          </div>
        </form>
      </div>

      {/* Custom Submit Confirmation Modal Overlay */}
      {showConfirmModal && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 10600, background: 'rgba(0,0,0,0.85)' }}>
          <div 
            className="spectre-template-modal-content" 
            style={{ 
              width: '450px', 
              height: 'auto', 
              background: '#12141a', 
              border: '1px solid rgba(168, 85, 247, 0.4)', 
              borderRadius: '16px', 
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.9), 0 0 30px rgba(168, 85, 247, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <Send size={36} color="#a855f7" />
              </div>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '800', margin: '0 0 8px 0' }}>Confirm Submission</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                Are you sure you want to submit this Intel Report? Once submitted, it will be placed in <strong>Pending Review</strong> status for evaluation by an Admin or Supervisor before being published and awarding points.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                style={{
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.4)',
                  color: '#a855f7',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(168,85,247,0.2)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(168,85,247,0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(168,85,247,0.15)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(168,85,247,0.2)'; }}
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
