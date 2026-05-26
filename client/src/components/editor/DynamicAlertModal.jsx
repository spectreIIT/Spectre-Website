import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const PRESET_COLORS = [
  { label: 'Purple', value: '#c084fc' },
  { label: 'Blue', value: '#60a5fa' },
  { label: 'Green', value: '#34d399' },
  { label: 'Yellow', value: '#fbbf24' },
  { label: 'Red', value: '#f87171' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Cyan', value: '#22d3ee' },
  { label: 'Orange', value: '#fb923c' }
];

const PRESET_ICONS = ['🚨', '⚠️', 'ℹ️', '💡', '🛡️', '📌', '🔥', '🚀', '🐛', '🏁', '💾', '🔑'];

export default function DynamicAlertModal({ isOpen, onClose, onInsert }) {
  const [title, setTitle] = useState('Important');
  const [color, setColor] = useState('#c084fc');
  const [customColor, setCustomColor] = useState('');
  const [icon, setIcon] = useState('🚨');
  const [content, setContent] = useState('Enter your alert message here...');

  if (!isOpen) return null;

  const handleColorSelect = (val) => {
    setColor(val);
    setCustomColor('');
  };

  const handleCustomColorChange = (e) => {
    const val = e.target.value;
    setCustomColor(val);
    if (val.match(/^#[0-9A-Fa-f]{6}$/)) {
      setColor(val);
    }
  };

  const handleInsert = () => {
    const activeColor = customColor.match(/^#[0-9A-Fa-f]{6}$/) ? customColor : color;
    const cleanTitle = title.trim() || 'Alert';
    const cleanContent = content.trim() || 'No content provided.';
    
    // Format: > [!Title|Color|Icon]
    // > Content lines
    const contentLines = cleanContent.split('\n').map(line => `> ${line}`).join('\n');
    const markdownSnippet = `> [!${cleanTitle}|${activeColor}|${icon}]\n${contentLines}\n`;
    
    onInsert(markdownSnippet);
    onClose();
  };

  return (
    <div className="spectre-template-modal-overlay" style={{ zIndex: 10500 }}>
      <div 
        className="spectre-template-modal-content" 
        style={{ 
          width: '680px', 
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
        <div className="template-modal-header" style={{ background: '#13151b', padding: '18px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3rem' }}>🎨</span> Create Dynamic Alert
          </h3>
          <button className="template-close-btn" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          {/* Title & Icon Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Alert Title / Label
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Security Warning, Pro Tip..." 
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
                Selected Icon
              </label>
              <div style={{ 
                background: '#090a0e', 
                border: '1px solid rgba(255,255,255,0.08)', 
                borderRadius: '8px', 
                padding: '8px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '1.4rem',
                height: '42px',
                boxSizing: 'border-box'
              }}>
                {icon}
              </div>
            </div>
          </div>

          {/* Icons Grid */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Choose Icon
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', background: '#13151b', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              {PRESET_ICONS.map(ico => (
                <button
                  key={ico}
                  type="button"
                  onClick={() => setIcon(ico)}
                  style={{
                    background: icon === ico ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                    border: icon === ico ? '1px solid #a855f7' : '1px solid transparent',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {ico}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alert Color Theme
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', background: '#13151b', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => handleColorSelect(c.value)}
                    title={c.label}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: c.value,
                      border: color === c.value && !customColor ? '2px solid #fff' : '2px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: color === c.value && !customColor ? `0 0 12px ${c.value}` : 'none',
                      transform: color === c.value && !customColor ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {color === c.value && !customColor && <Check size={14} color="#000" strokeWidth={3} />}
                  </button>
                ))}
              </div>

              <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Hex:</span>
                <input 
                  type="text" 
                  value={customColor} 
                  onChange={handleCustomColorChange}
                  placeholder="#FFFFFF" 
                  style={{
                    width: '90px',
                    background: '#090a0e',
                    border: customColor ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    fontFamily: 'monospace',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label style={{ display: 'block', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alert Message Content
            </label>
            <textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                background: '#090a0e',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#cbd5e1',
                fontSize: '0.9rem',
                lineHeight: '1.5',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Live Preview */}
          <div>
            <label style={{ display: 'block', color: '#a855f7', fontSize: '0.75rem', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Preview
            </label>
            <div style={{
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              borderLeft: `4px solid ${color}`,
              padding: '16px 20px',
              borderRadius: '8px',
              borderTop: '1px solid rgba(255,255,255,0.02)',
              borderRight: '1px solid rgba(255,255,255,0.02)',
              borderBottom: '1px solid rgba(255,255,255,0.02)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
              color: '#cbd5e1',
              lineHeight: '1.6',
              fontSize: '0.88rem',
              backdropFilter: 'blur(12px)',
              marginTop: '4px'
            }}>
              <div style={{ color: color, fontWeight: '700', fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1rem' }}>{icon}</span>
                <span>{title || 'Alert'}</span>
              </div>
              <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>
                {content || 'No content provided.'}
              </div>
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
            Insert Alert
          </button>
        </div>
      </div>
    </div>
  );
}
