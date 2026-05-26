import React from 'react';
import { parseMarkdownToHTML } from '../../utils/editor/markdownParser';

export default function PreviewPane({ value }) {
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
      dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(value) }}
    />
  );
}
