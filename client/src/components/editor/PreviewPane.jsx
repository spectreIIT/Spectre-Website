import React, { useState } from 'react';
import { parseMarkdownToHTML } from '../../utils/editor/markdownParser';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const InlineHintPreview = ({ hint }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ margin: '12px 0', padding: '10px 14px', background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', fontSize: '0.88rem' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#cbd5e1', fontWeight: '600' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lightbulb size={16} color="#a855f7" /> 
          Hint {hint.cost > 0 ? <span style={{ color: '#ef4444', fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', marginLeft: '6px' }}>-{hint.cost} pts</span> : ''}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </div>
      {isOpen && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed rgba(168, 85, 247, 0.2)', color: '#94a3b8', lineHeight: '1.5' }}>
          {hint.text || <span style={{ fontStyle: 'italic' }}>No text configured.</span>}
        </div>
      )}
    </div>
  );
};

export default function PreviewPane({ value, hints = [] }) {
  const handlePaneClick = (e) => {
    const btn = e.target.closest('.copy-code-btn');
    if (btn) {
      const encodedCode = btn.getAttribute('data-code');
      if (encodedCode) {
        try {
          const codeText = decodeURIComponent(encodedCode);
          navigator.clipboard.writeText(codeText);
          
          const originalText = btn.innerHTML;
          const isIconOnly = originalText.includes('<svg') || btn.tagName.toLowerCase() === 'svg';
          
          if (isIconOnly) {
            btn.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            `;
            btn.style.color = '#10b981';
            
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.color = '';
            }, 2000);
          } else {
            btn.innerHTML = 'Copied!';
            btn.style.color = '#10b981';
            btn.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            btn.style.background = 'rgba(16, 185, 129, 0.05)';
            
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.color = '';
              btn.style.borderColor = '';
              btn.style.background = '';
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      }
    }
  };

  return (
    <div 
      className="spectre-editor-preview-pane markdown-preview"
      onClick={handlePaneClick}
    >
      {(() => {
        const html = parseMarkdownToHTML(value);
        const parts = html.split(/({{HINT:\s*[a-zA-Z0-9_-]+}})/g);
        
        return parts.map((part, i) => {
          const match = part.match(/{{HINT:\s*([a-zA-Z0-9_-]+)}}/);
          if (match) {
            const hintId = match[1];
            const hintData = hints.find(h => h.id === hintId);
            if (!hintData) return <span key={i} style={{ color: '#ef4444' }}>[Invalid Hint: {hintId}]</span>;
            return <InlineHintPreview key={i} hint={hintData} />;
          }
          return <div key={i} dangerouslySetInnerHTML={{ __html: part }} />;
        });
      })()}
    </div>
  );
}
