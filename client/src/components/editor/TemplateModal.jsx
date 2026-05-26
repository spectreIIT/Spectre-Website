import React, { useState, useMemo } from 'react';
import { Search, X, Sparkles, BookOpen, Copy, PlusCircle, AlertOctagon, Check } from 'lucide-react';
import { TEMPLATES, CATEGORIES } from '../../constants/templates';

export default function TemplateModal({ isOpen, onClose, onInsertAtCursor, onOverwriteCanvas }) {
  if (!isOpen) return null;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Categories list
  const categoryOptions = useMemo(() => {
    return ['ALL', ...Object.values(CATEGORIES)];
  }, []);

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(tpl => {
      const categoryMatch = selectedCategory === 'ALL' || tpl.category === selectedCategory;
      const searchMatch = !searchQuery || 
        tpl.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="spectre-template-modal-overlay" onClick={onClose}>
      <div className="spectre-template-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="template-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#a855f7" />
            <h3>Spectre Solve Templates</h3>
          </div>
          <button type="button" className="template-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="template-modal-body">
          {/* Left panel: Catalog and search */}
          <div className="template-catalog-pane">
            <div className="template-search-wrapper">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category tabs */}
            <div className="template-category-tabs">
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`category-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'ALL' ? 'All' : cat.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Template items list */}
            <div className="template-list-scroller">
              {filteredTemplates.length === 0 ? (
                <div className="template-no-results">
                  No templates match your query.
                </div>
              ) : (
                filteredTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={`template-item-card ${selectedTemplate.id === tpl.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTemplate(tpl)}
                  >
                    <span className="template-badge">{tpl.category}</span>
                    <h4 className="template-label">{tpl.label}</h4>
                    <p className="template-description">{tpl.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Live Preview & Action */}
          <div className="template-preview-pane">
            {selectedTemplate ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="template-preview-meta">
                  <span className="meta-category">{selectedTemplate.category}</span>
                  <h4 className="meta-label">{selectedTemplate.label}</h4>
                  <p className="meta-description">{selectedTemplate.description}</p>
                </div>

                <div className="template-preview-code-wrapper">
                  <div className="code-header">
                    <BookOpen size={12} /> Live Raw Outline Preview
                  </div>
                  <pre className="code-content"><code>{selectedTemplate.content}</code></pre>
                </div>

                <div className="template-preview-actions">
                  <button
                    type="button"
                    className="template-btn insert"
                    onClick={() => {
                      onInsertAtCursor(selectedTemplate.content);
                      onClose();
                    }}
                  >
                    <PlusCircle size={14} /> Insert at Cursor
                  </button>
                  <button
                    type="button"
                    className="template-btn overwrite"
                    onClick={() => setShowOverwriteConfirm(true)}
                  >
                    <AlertOctagon size={14} /> Overwrite Draft
                  </button>
                </div>
              </div>
            ) : (
              <div className="template-select-prompt">
                Select a template from the catalog list to preview and inject.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Overwrite Confirmation Modal Overlay */}
      {showOverwriteConfirm && (
        <div className="spectre-template-modal-overlay" style={{ zIndex: 10600, background: 'rgba(0,0,0,0.85)' }} onClick={(e) => e.stopPropagation()}>
          <div 
            className="spectre-template-modal-content" 
            style={{ 
              width: '450px', 
              height: 'auto', 
              background: '#12141a', 
              border: '1px solid rgba(239, 68, 68, 0.4)', 
              borderRadius: '16px', 
              padding: '28px',
              boxShadow: '0 25px 50px rgba(0,0,0,0.9), 0 0 30px rgba(239, 68, 68, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              textAlign: 'center'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '16px', borderRadius: '50%', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <AlertOctagon size={36} color="#ef4444" />
              </div>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: '1.25rem', fontWeight: '800', margin: '0 0 8px 0' }}>Overwrite Draft?</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>
                Are you sure you want to overwrite the editor canvas? This action will replace all current content with the selected template.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowOverwriteConfirm(false)}
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
                onClick={() => {
                  onOverwriteCanvas(selectedTemplate.content);
                  setShowOverwriteConfirm(false);
                  onClose();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#ef4444',
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.2)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.2)'; }}
              >
                Confirm Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
