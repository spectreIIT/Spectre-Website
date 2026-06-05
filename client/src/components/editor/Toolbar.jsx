import React from 'react';
import { 
  Bold, Italic, Underline, Link as LinkIcon, Image, Code, Terminal, Info, 
  Eye, Edit3, Columns, Maximize, Minimize, RefreshCw, FileText, Star,
  Heading1, Heading2, Heading3, Table, Lightbulb
} from 'lucide-react';
import { ACTION_GROUPS, TOOLBAR_ACTIONS } from '../../constants/toolbarActions';

export default function Toolbar({ 
  activeTab, 
  setActiveTab, 
  onActionClick, 
  onTemplateToggle, 
  isFullscreen, 
  onFullscreenToggle 
}) {
  const getIcon = (id) => {
    switch (id) {
      case 'bold': return <Bold size={14} />;
      case 'italic': return <Italic size={14} />;
      case 'underline': return <Underline size={14} />;
      case 'heading1': return <Heading1 size={14} />;
      case 'heading2': return <Heading2 size={14} />;
      case 'heading3': return <Heading3 size={14} />;
      case 'link': return <LinkIcon size={14} />;
      case 'image': return <Image size={14} />;
      case 'inlineCode': return <Code size={14} />;
      case 'codeBlock': return <Code size={14} style={{ opacity: 0.7 }} />;
      case 'terminalBlock': return <Terminal size={14} />;
      case 'dynamicAlert': return <Info size={14} color="#a855f7" />;
      case 'stepCard': return <Star size={14} color="#a855f7" />;
      case 'table': return <Table size={14} />;
      case 'hint': return <Lightbulb size={14} color="#f59e0b" />;
      default: return <Info size={14} />;
    }
  };

  // Group toolbar actions
  const groups = Object.values(ACTION_GROUPS).map(groupName => ({
    name: groupName,
    actions: TOOLBAR_ACTIONS.filter(act => act.group === groupName)
  }));

  return (
    <div className="spectre-editor-toolbar-wrapper">
      {/* View Mode controls */}
      <div className="toolbar-controls-group view-modes">
        <button 
          type="button" 
          className={`mode-btn ${activeTab === 'write' ? 'active' : ''}`}
          onClick={() => setActiveTab('write')}
        >
          <Edit3 size={13} /> <span>Write</span>
        </button>
        <button 
          type="button" 
          className={`mode-btn ${activeTab === 'split' ? 'active' : ''}`}
          onClick={() => setActiveTab('split')}
        >
          <Columns size={13} /> <span>Split</span>
        </button>
        <button 
          type="button" 
          className={`mode-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          <Eye size={13} /> <span>Preview</span>
        </button>
      </div>

      {/* Formatting & Insert Actions (Only visible in editing views) */}
      {activeTab !== 'preview' && (
        <div className="toolbar-commands-container">
          {groups.map((group, gIdx) => (
            <React.Fragment key={group.name}>
              {gIdx > 0 && <span className="toolbar-separator" />}
              <div className="toolbar-actions-subgroup" data-group={group.name}>
                {group.actions.map(act => (
                  <button
                    key={act.id}
                    type="button"
                    className="toolbar-action-btn"
                    onClick={() => onActionClick(act.before, act.after, act.defaultText, act.id)}
                  >
                    {getIcon(act.id)}
                    <span className="tooltip-text">{act.label} <kbd>{act.shortcut}</kbd></span>
                  </button>
                ))}
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      <div style={{ flexGrow: 1 }} />

      {/* Templates & Layout Actions */}
      <div className="toolbar-controls-group actions-right">
        <button
          type="button"
          className="templates-trigger-btn"
          onClick={onTemplateToggle}
        >
          <RefreshCw size={13} className="template-icon-spin" />
          <span>Templates</span>
        </button>

        <span className="toolbar-separator" />

        <button
          type="button"
          className="fullscreen-toggle-btn"
          onClick={onFullscreenToggle}
        >
          {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
        </button>
      </div>
    </div>
  );
}
