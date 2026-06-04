import React, { useState, useEffect, useRef } from 'react';
import Toolbar from './Toolbar';
import PreviewPane from './PreviewPane';
import SlashMenu from './SlashMenu';
import StatusBar from './StatusBar';
import TemplateModal from './TemplateModal';
import TableModal from './TableModal';
import DynamicAlertModal from './DynamicAlertModal';
import { handleKeyDown } from '../../utils/editor/shortcuts';
import { applyCommand } from '../../utils/editor/editorCommands';
import { uploadImageToCloudinary } from '../../utils/editor/cloudinaryUpload';
import '../../styles/components/Editor.css';

export default function Editor({ value, onChange, placeholder = 'Write your markdown content here...', draftKey = 'spectre_editor_draft' }) {
  const [activeTab, setActiveTab] = useState('write'); // 'write', 'split', 'preview'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle'); // 'idle', 'saving', 'saved'
  
  const [slashMenu, setSlashMenu] = useState({ visible: false, query: '', x: 0, y: 0 });
  
  const textareaRef = useRef(null);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  // 1. Recover Draft Autosave from localStorage on mount
  useEffect(() => {
    if (!draftKey) return;
    const draft = localStorage.getItem(draftKey);
    if (draft && !value) {
      onChange(draft);
    }
  }, []);

  // 2. Autosave system triggered on value change
  useEffect(() => {
    if (!value || !draftKey) return;

    setAutosaveState('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(draftKey, value);
      setAutosaveState('saved');
      
      const idleTimer = setTimeout(() => {
        setAutosaveState('idle');
      }, 1500);

      return () => clearTimeout(idleTimer);
    }, 1000);

    return () => clearTimeout(timer);
  }, [value, draftKey]);

  // Global Keyboard shortcut listener to override browser defaults (Ctrl+U, Ctrl+Shift+T, etc.)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      // If pressing Tab while not focused inside the editor textarea, allow normal browser navigation
      if (e.key === 'Tab' && document.activeElement !== textarea) {
        return;
      }

      const handled = handleKeyDown(e, textarea, onChange);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [onChange]);

  const handleImageUpload = async (file) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    const uploadingText = `![Uploading ${file.name}...]()`;
    const newValue = currentValue.substring(0, start) + uploadingText + currentValue.substring(end);
    onChange(newValue);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + uploadingText.length, start + uploadingText.length);
    }, 50);

    try {
      const url = await uploadImageToCloudinary(file);
      const imgLink = `![${file.name}|100%xauto](${url})`;
      
      onChange(prevValue => prevValue.replace(uploadingText, imgLink));
    } catch (err) {
      console.error('Image upload failed:', err);
      onChange(prevValue => prevValue.replace(uploadingText, `[Upload failed: ${file.name}]`));
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(file);
            break;
          }
        }
      }
    }
  };

  const handleDrop = (e) => {
    const items = e.dataTransfer?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleImageUpload(file);
            break;
          }
        }
      }
    }
  };

  // Handle Toolbar button executions
  const handleToolbarAction = (before, after, defaultText, id) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (id === 'table') {
      setShowTableModal(true);
      return;
    }
    
    if (id === 'dynamicAlert') {
      setShowAlertModal(true);
      return;
    }

    if (id === 'image') {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
      return;
    }

    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, before, after, defaultText);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 50);
  };

  // Keyboard events for Slash Menu
  const handleKeyDownEvent = (e) => {
    if (slashMenu.visible) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Escape') {
        return;
      }
    }
  };

  // Detect change for Slash Commands
  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const slashIndex = textBeforeCursor.lastIndexOf('/');

    if (slashIndex !== -1 && (slashIndex === 0 || textBeforeCursor[slashIndex - 1] === ' ' || textBeforeCursor[slashIndex - 1] === '\n')) {
      const queryText = textBeforeCursor.substring(slashIndex + 1);
      if (!queryText.includes(' ') && !queryText.includes('\n')) {
        // Calculate caret position inside textarea
        // Let's place it absolute directly inside the textarea container space
        const containerRect = editorRef.current.getBoundingClientRect();
        // Fallback floating positioning
        setSlashMenu({
          visible: true,
          query: queryText,
          x: 100,
          y: 120
        });
        return;
      }
    }
    setSlashMenu(prev => ({ ...prev, visible: false }));
  };

  // Execute slash command insert
  const handleSlashSelect = (cmd) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const valueText = textarea.value;
    const textBeforeCursor = valueText.substring(0, selectionStart);
    const slashIndex = textBeforeCursor.lastIndexOf('/');

    if (slashIndex !== -1) {
      if (cmd.isSpecial) {
        if (cmd.id === 'table') {
          setShowTableModal(true);
        } else if (cmd.id === 'dynamicAlert') {
          setShowAlertModal(true);
        } else if (cmd.id === 'image') {
          if (fileInputRef.current) {
            fileInputRef.current.click();
          }
        } else {
          // Trigger templates overlay
          setShowTemplates(true);
        }
        
        // Clean up the typed slash character from editor
        const cleanVal = valueText.substring(0, slashIndex) + valueText.substring(selectionStart);
        onChange(cleanVal);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(slashIndex, slashIndex);
        }, 50);
      } else {
        // Apply formatted command insertion
        const textBeforeSlash = valueText.substring(0, slashIndex);
        const textAfterCursor = valueText.substring(selectionStart);
        
        const insertion = cmd.before + cmd.defaultText + cmd.after;
        const newValue = textBeforeSlash + insertion + textAfterCursor;
        onChange(newValue);

        const newCursorStart = slashIndex + cmd.before.length;
        const newCursorEnd = newCursorStart + cmd.defaultText.length;

        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(newCursorStart, newCursorEnd);
        }, 50);
      }
    }
    setSlashMenu(prev => ({ ...prev, visible: false }));
  };

  // Insert template content at cursor position
  const handleInsertTemplateAtCursor = (content) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = textarea.value;

    const newValue = currentValue.substring(0, start) + content + currentValue.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + content.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 50);
  };

  // Overwrite Canvas template loading
  const handleOverwriteCanvas = (content) => {
    onChange(content);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(content.length, content.length);
      }
    }, 50);
  };

  return (
    <div 
      ref={editorRef}
      className={`spectre-premium-editor-container ${isFullscreen ? 'fullscreen-active' : ''}`}
    >
      {/* Smart Organized Toolbar */}
      <Toolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onActionClick={handleToolbarAction}
        onTemplateToggle={() => setShowTemplates(true)}
        isFullscreen={isFullscreen}
        onFullscreenToggle={() => setIsFullscreen(prev => !prev)}
      />

      {/* Editor Main Canvas Body */}
      <div className={`spectre-premium-editor-canvas mode-${activeTab}`}>
        {/* Editing input Pane */}
        {activeTab !== 'preview' && (
          <div className="canvas-pane-editor">
            <textarea
              ref={textareaRef}
              id="spectre-editor-textarea"
              value={value || ''}
              onChange={handleInputChange}
              onKeyDown={handleKeyDownEvent}
              onPaste={handlePaste}
              onDrop={handleDrop}
              placeholder={placeholder}
            />

            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleImageUpload(e.target.files[0]);
                  e.target.value = ''; // Reset input to allow re-uploading the same file
                }
              }} 
            />

            {/* Modern Fuzzy Matching Slash Command Menu */}
            {slashMenu.visible && (
              <SlashMenu
                query={slashMenu.query}
                position={{ x: slashMenu.x, y: slashMenu.y }}
                onSelect={handleSlashSelect}
                onClose={() => setSlashMenu(prev => ({ ...prev, visible: false }))}
              />
            )}
          </div>
        )}

        {/* Live rendering Preview Pane */}
        {activeTab !== 'write' && (
          <div className="canvas-pane-preview">
            <PreviewPane value={value} />
          </div>
        )}
      </div>

      {/* Modern High-End Status Bar Footer */}
      <StatusBar 
        value={value} 
        activeTab={activeTab} 
        autosaveState={autosaveState} 
      />

      {/* Templates catalog Modal drawer */}
      <TemplateModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onInsertAtCursor={handleInsertTemplateAtCursor}
        onOverwriteCanvas={handleOverwriteCanvas}
      />
      
      {/* Dynamic Modals */}
      <TableModal 
        isOpen={showTableModal} 
        onClose={() => setShowTableModal(false)} 
        onInsert={handleInsertTemplateAtCursor} 
      />
      
      <DynamicAlertModal 
        isOpen={showAlertModal} 
        onClose={() => setShowAlertModal(false)} 
        onInsert={handleInsertTemplateAtCursor} 
      />
    </div>
  );
}
