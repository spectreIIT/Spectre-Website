import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';

export default function HintModal({ isOpen, onClose, onInsert }) {
  const [hintText, setHintText] = useState('');
  const [cost, setCost] = useState(0);

  if (!isOpen) return null;

  const handleInsert = () => {
    onInsert(hintText, parseInt(cost) || 0);
    setHintText('');
    setCost(0);
    onClose();
  };

  return (
    <div className="spectre-template-modal-overlay" style={{ zIndex: 10500, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div 
        className="spectre-template-modal-content" 
        style={{ 
          width: '580px', 
          background: '#0f1115', 
          border: '1px solid rgba(168, 85, 247, 0.4)', 
          boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 40px rgba(168, 85, 247, 0.15)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="template-modal-header" style={{ background: '#13151b', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lightbulb size={20} color="#a855f7" /> Insert Inline Hint
          </h3>
          <button type="button" className="template-close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Hint Text (Markdown Supported)
            </label>
            <textarea 
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              placeholder="e.g. Try looking at the page source."
              style={{
                width: '100%',
                minHeight: '100px',
                background: '#090a0e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Point Deduction Cost
            </label>
            <input 
              type="number" 
              value={cost} 
              onChange={(e) => setCost(e.target.value)}
              min="0"
              style={{
                width: '100%',
                background: '#090a0e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ padding: '16px 24px', background: '#13151b', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleInsert}
            disabled={!hintText.trim()}
            style={{
              background: hintText.trim() ? 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)' : '#334155',
              border: 'none',
              color: hintText.trim() ? '#fff' : '#94a3b8',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: hintText.trim() ? 'pointer' : 'not-allowed',
              boxShadow: hintText.trim() ? '0 4px 15px rgba(168, 85, 247, 0.4)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            Insert Hint
          </button>
        </div>
      </div>
    </div>
  );
}
