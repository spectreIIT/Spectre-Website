import React from 'react';
import { Check, CloudLightning, Info } from 'lucide-react';

export default function StatusBar({ value, activeTab, autosaveState }) {
  const charCount = value ? value.length : 0;
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;
  const lineCount = value ? value.split('\n').length : 0;

  const getAutosaveStateLabel = () => {
    switch (autosaveState) {
      case 'saving':
        return (
          <span className="save-status saving" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a855f7' }}>
            <span className="dot-pulse-slow" /> Saving...
          </span>
        );
      case 'saved':
        return (
          <span className="save-status saved" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
            <Check size={12} /> Saved to Cloud
          </span>
        );
      default:
        return (
          <span className="save-status idle" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
            <CloudLightning size={12} /> Draft Active
          </span>
        );
    }
  };

  const getModeLabel = () => {
    switch (activeTab) {
      case 'split': return 'Split Layout';
      case 'preview': return 'Read Mode';
      default: return 'Write Mode';
    }
  };

  return (
    <div className="spectre-editor-status-bar">
      <div className="status-bar-left">
        <span className="status-metric"><b>{wordCount}</b> {wordCount === 1 ? 'word' : 'words'}</span>
        <span className="status-separator" />
        <span className="status-metric"><b>{lineCount}</b> {lineCount === 1 ? 'line' : 'lines'}</span>
        <span className="status-separator" />
        <span className="status-metric"><b>{charCount}</b> {charCount === 1 ? 'char' : 'chars'}</span>
      </div>

      <div className="status-bar-right">
        <div className="status-save-container">
          {getAutosaveStateLabel()}
        </div>
        <span className="status-separator" />
        <span className="status-mode-badge">{getModeLabel()}</span>
        <span className="status-separator" />
        <span className="status-markdown-active" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#c084fc', fontWeight: 600 }}>
          <Info size={11} /> Markdown
        </span>
      </div>
    </div>
  );
}
