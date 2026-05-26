import React, { useState, useEffect, useRef } from 'react';
import { Code, Terminal, AlertTriangle, Info, Image, Link as LinkIcon, RefreshCw, Star } from 'lucide-react';

const COMMANDS = [
  { id: 'code', label: 'Code Block', desc: 'Insert a fenced Javascript code block', shortcut: '/code', before: '```javascript\n', after: '\n```', defaultText: '// your code here', icon: <Code size={14} /> },
  { id: 'terminal', label: 'Terminal Command', desc: 'Insert a $ bash terminal input line', shortcut: '/terminal', before: '$ ', after: '', defaultText: 'ping -c 4 target.ctf', icon: <Terminal size={14} /> },
  { id: 'dynamicAlert', label: 'Dynamic Alert Callout', desc: 'Insert a custom alert banner with your own title, color & icon', shortcut: '/alert', before: '> [!Dynamic Alert|#a855f7|📌]\n> ', after: '', defaultText: 'Enter your custom alert content here...', icon: <Info size={14} style={{ color: '#a855f7' }} /> },
  { id: 'stepCard', label: 'Step Card Breakdown', desc: 'Insert a sequential numbered step breakdown card', shortcut: '/step', before: '> [!STEP|1|Step Title]\n> ', after: '', defaultText: 'Enter step description here...', icon: <Star size={14} style={{ color: '#a855f7' }} /> },
  { id: 'image', label: 'Image Attachment', desc: 'Insert a markdown image anchor', shortcut: '/image', before: '![', after: '](https://example.com/image.png)', defaultText: 'Image Description', icon: <Image size={14} /> },
  { id: 'link', label: 'Hyperlink Anchor', desc: 'Insert a standard hyperlinked tag', shortcut: '/link', before: '[', after: '](https://example.com)', defaultText: 'Link Text', icon: <LinkIcon size={14} /> },
  { id: 'template', label: 'Walkthrough Templates', desc: 'Browse and load preset operational templates', shortcut: '/template', isSpecial: true, icon: <RefreshCw size={14} /> }
];

export default function SlashMenu({ query, onSelect, onClose, position }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  // Filter commands by fuzzy match against label/shortcut/desc
  const filtered = COMMANDS.filter(cmd => {
    const q = query.toLowerCase().replace('/', '');
    if (!q) return true;
    return cmd.label.toLowerCase().includes(q) || 
           cmd.shortcut.toLowerCase().includes(q) ||
           cmd.desc.toLowerCase().includes(q);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [filtered, selectedIndex]);

  // Click outside listener
  useEffect(() => {
    const clickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const triggerSelect = (cmd) => {
    onSelect(cmd);
  };

  if (filtered.length === 0) return null;

  // Render position (supports dynamic offset absolute rendering near user inputs)
  const menuStyle = {
    position: 'absolute',
    left: `${Math.min(position.x, 300)}px`,
    top: `${Math.min(position.y + 20, 250)}px`,
    zIndex: 999
  };

  return (
    <div 
      ref={menuRef} 
      className="spectre-editor-slash-menu" 
      style={menuStyle}
    >
      <div className="slash-menu-header">
        Commands matching <span className="slash-query">/{query}</span>
      </div>
      <div className="slash-menu-list">
        {filtered.map((cmd, idx) => (
          <div
            key={cmd.id}
            className={`slash-menu-item ${idx === selectedIndex ? 'active' : ''}`}
            onClick={() => triggerSelect(cmd)}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <div className="slash-item-icon">{cmd.icon}</div>
            <div className="slash-item-meta">
              <div className="slash-item-label">
                {cmd.label}
                {cmd.isSpecial && <span className="special-badge">Special</span>}
              </div>
              <div className="slash-item-desc">{cmd.desc}</div>
            </div>
            <div className="slash-item-shortcut">{cmd.shortcut}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
