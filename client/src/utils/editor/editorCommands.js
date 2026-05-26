/**
 * Textarea Selection and Command Helpers for Spectre Editor
 */

export const getSelectionState = (textarea) => {
  if (!textarea) return { start: 0, end: 0, selectedText: '', value: '' };
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(start, end);
  
  return { start, end, selectedText, value };
};

export const applyCommand = (textarea, before, after, defaultText = 'text') => {
  if (!textarea) return { newValue: '', cursorStart: 0, cursorEnd: 0 };

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(start, end);

  // Check if this action is an inline toggle wrapper
  const isWrapper = (before === '**' && after === '**') || 
                    (before === '*' && after === '*') || 
                    (before === '<u>' && after === '</u>') || 
                    (before === '`' && after === '`');

  if (isWrapper) {
    // Case 1: The selection itself is wrapped
    if (selectedText.startsWith(before) && selectedText.endsWith(after)) {
      const unwrapped = selectedText.substring(before.length, selectedText.length - after.length);
      const newValue = value.substring(0, start) + unwrapped + value.substring(end);
      return {
        newValue,
        cursorStart: start,
        cursorEnd: start + unwrapped.length
      };
    }

    // Case 2: The wrappers are just outside the selection
    const hasBeforeOutside = value.substring(start - before.length, start) === before;
    const hasAfterOutside = value.substring(end, end + after.length) === after;

    if (hasBeforeOutside && hasAfterOutside) {
      const newValue = value.substring(0, start - before.length) + selectedText + value.substring(end + after.length);
      return {
        newValue,
        cursorStart: start - before.length,
        cursorEnd: start - before.length + selectedText.length
      };
    }
  }

  // Fallback: Apply wrapper/insertion standard logic
  const placeholder = selectedText || defaultText;
  const insertContent = before + placeholder + after;
  const newValue = value.substring(0, start) + insertContent + value.substring(end);
  const cursorStart = start + before.length;
  const cursorEnd = cursorStart + placeholder.length;

  return { newValue, cursorStart, cursorEnd };
};

export const applyIndent = (textarea, isOutdent = false) => {
  if (!textarea) return null;

  const { start, end, value } = getSelectionState(textarea);
  
  // Find beginning of current line
  const beforeText = value.substring(0, start);
  const lineStart = beforeText.lastIndexOf('\n') + 1;
  const lineEnd = value.indexOf('\n', start);
  const actualLineEnd = lineEnd === -1 ? value.length : lineEnd;
  
  const lineText = value.substring(lineStart, actualLineEnd);
  
  let newLineText = lineText;
  let cursorOffset = 0;

  if (isOutdent) {
    if (lineText.startsWith('  ')) {
      newLineText = lineText.substring(2);
      cursorOffset = -2;
    } else if (lineText.startsWith('\t')) {
      newLineText = lineText.substring(1);
      cursorOffset = -1;
    }
  } else {
    // Add two spaces indent
    newLineText = '  ' + lineText;
    cursorOffset = 2;
  }

  const newValue = value.substring(0, lineStart) + newLineText + value.substring(actualLineEnd);
  const newCursorPos = Math.max(lineStart, start + cursorOffset);

  return { newValue, newCursorPos };
};
