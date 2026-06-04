import React, { useState } from 'react';
import { X, AlignLeft, AlignCenter, AlignRight, Table } from 'lucide-react';

export default function TableModal({ isOpen, onClose, onInsert }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [alignment, setAlignment] = useState('left'); // 'left', 'center', 'right'

  if (!isOpen) return null;

  const handleInsert = () => {
    let r = parseInt(rows) || 3;
    let c = parseInt(cols) || 3;
    if (r < 1) r = 1;
    if (c < 1) c = 1;

    let alignChar = '';
    if (alignment === 'left') alignChar = ':---';
    else if (alignment === 'center') alignChar = ':---:';
    else if (alignment === 'right') alignChar = '---:';

    let markdownSnippet = '\n';
    
    // Header
    markdownSnippet += '|' + Array(c).fill(' Header ').join('|') + '|\n';
    // Divider
    markdownSnippet += '|' + Array(c).fill(` ${alignChar} `).join('|') + '|\n';
    // Rows
    for (let i = 0; i < r; i++) {
      markdownSnippet += '|' + Array(c).fill(' Cell ').join('|') + '|\n';
    }
    markdownSnippet += '\n';
    
    onInsert(markdownSnippet);
    onClose();
  };

  const previewTable = () => {
    let r = Math.min(parseInt(rows) || 3, 5); // Limit preview rows
    let c = Math.min(parseInt(cols) || 3, 5); // Limit preview cols
    
    let alignStyle = 'left';
    if (alignment === 'center') alignStyle = 'center';
    if (alignment === 'right') alignStyle = 'right';

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#cbd5e1', fontSize: '0.88rem' }}>
        <thead>
          <tr>
            {Array(c).fill(0).map((_, i) => (
              <th key={i} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: alignStyle, fontWeight: '700' }}>Header</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(r).fill(0).map((_, i) => (
            <tr key={i}>
              {Array(c).fill(0).map((_, j) => (
                <td key={j} style={{ padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: alignStyle }}>Cell</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="spectre-template-modal-overlay" style={{ zIndex: 10500, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div 
        className="spectre-template-modal-content" 
        style={{ 
          width: '580px', 
          height: 'auto', 
          maxHeight: '90vh', 
          background: '#0f1115', 
          border: '1px solid rgba(168, 85, 247, 0.4)', 
          boxShadow: '0 25px 50px rgba(0,0,0,0.8), 0 0 40px rgba(168, 85, 247, 0.15)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="template-modal-header" style={{ background: '#13151b', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Table size={20} color="#a855f7" /> Insert Markdown Table
          </h3>
          <button type="button" className="template-close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          {/* Dimensions Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Rows
              </label>
              <input 
                type="number" 
                value={rows} 
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="50"
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
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Columns
              </label>
              <input 
                type="number" 
                value={cols} 
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="20"
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

          {/* Alignment */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Text Alignment
            </label>
            <div style={{ display: 'flex', gap: '8px', background: '#13151b', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <button
                type="button"
                onClick={() => setAlignment('left')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: alignment === 'left' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: alignment === 'left' ? '1px solid #a855f7' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '8px',
                  color: alignment === 'left' ? '#fff' : '#94a3b8',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <AlignLeft size={16} /> Left
              </button>
              <button
                type="button"
                onClick={() => setAlignment('center')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: alignment === 'center' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: alignment === 'center' ? '1px solid #a855f7' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '8px',
                  color: alignment === 'center' ? '#fff' : '#94a3b8',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <AlignCenter size={16} /> Center
              </button>
              <button
                type="button"
                onClick={() => setAlignment('right')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: alignment === 'right' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                  border: alignment === 'right' ? '1px solid #a855f7' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '8px',
                  color: alignment === 'right' ? '#fff' : '#94a3b8',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <AlignRight size={16} /> Right
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div>
            <label style={{ display: 'block', color: '#a855f7', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Preview
            </label>
            <div style={{
              background: '#090a0e',
              padding: '16px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              marginTop: '4px',
              overflowX: 'auto'
            }}>
              {previewTable()}
              {(rows > 5 || cols > 5) && (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.75rem', marginTop: '12px' }}>
                  Preview limited to 5x5. Inserted table will have {rows} rows and {cols} columns.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#fff'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleInsert}
            style={{
              background: 'linear-gradient(135deg, #a855f7 0%, #c084fc 100%)',
              border: 'none',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            Insert Table
          </button>
        </div>
      </div>
    </div>
  );
}
