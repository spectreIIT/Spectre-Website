import { applyCommand, applyIndent } from './editorCommands';

/**
 * Handles professional IDE keyboard shortcuts inside the markdown editor
 */
export const handleKeyDown = (event, textarea, onValueChange, onImageUploadShortcut) => {
  if (!textarea) return false;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const isCtrl = isMac ? event.metaKey : event.ctrlKey;
  const isShift = event.shiftKey;

  // Tab Indent
  if (event.key === 'Tab') {
    event.preventDefault();
    const result = applyIndent(textarea, isShift);
    if (result) {
      onValueChange(result.newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = result.newCursorPos;
      }, 0);
    }
    return true;
  }

  // Bold (Ctrl/Cmd + B)
  if (isCtrl && !isShift && event.key.toLowerCase() === 'b') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '**', '**', 'bold text');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Italic (Ctrl/Cmd + I)
  if (isCtrl && !isShift && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '*', '*', 'italic text');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Underline (Ctrl/Cmd + U)
  if (isCtrl && !isShift && event.key.toLowerCase() === 'u') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '<u>', '</u>', 'underlined text');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Link (Ctrl/Cmd + K)
  if (isCtrl && !isShift && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '[', '](https://example.com)', 'Link Text');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Image (Ctrl/Cmd + Shift + I)
  if (isCtrl && isShift && event.key.toLowerCase() === 'i') {
    event.preventDefault();
    if (onImageUploadShortcut) {
      onImageUploadShortcut();
    } else {
      const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '![', '](https://example.com/image.png)', 'Image Description');
      onValueChange(newValue);
      setTimeout(() => {
        textarea.setSelectionRange(cursorStart, cursorEnd);
        textarea.focus();
      }, 0);
    }
    return true;
  }

  // Inline Code (Ctrl/Cmd + E)
  if (isCtrl && !isShift && event.key.toLowerCase() === 'e') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '`', '`', 'code');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Code Block (Ctrl/Cmd + Shift + C)
  if (isCtrl && isShift && event.key.toLowerCase() === 'c') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '```javascript\n', '\n```', '// your code here');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Terminal Block (Ctrl/Cmd + Shift + K)
  if (isCtrl && isShift && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '$ ', '', 'ping -c 4 google.com');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Dynamic Alert (Ctrl/Cmd + Shift + A)
  if (isCtrl && isShift && event.key.toLowerCase() === 'a') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '> [!Dynamic Alert|#a855f7|📌]\n> ', '', 'Enter your custom alert content here...');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Step Card (Ctrl/Cmd + Shift + S)
  if (isCtrl && isShift && event.key.toLowerCase() === 's') {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '> [!STEP|1|Step Title]\n> ', '', 'Enter step description here...');
    onValueChange(newValue);
    setTimeout(() => {
      textarea.setSelectionRange(cursorStart, cursorEnd);
      textarea.focus();
    }, 0);
    return true;
  }

  // Headings (Ctrl/Cmd + Shift + 1/2/3)
  if (isCtrl && isShift && (event.code === 'Digit1' || event.key === '!' || event.key === '1')) {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '# ', '', 'Heading 1');
    onValueChange(newValue);
    setTimeout(() => { textarea.setSelectionRange(cursorStart, cursorEnd); textarea.focus(); }, 0);
    return true;
  }
  if (isCtrl && isShift && (event.code === 'Digit2' || event.key === '@' || event.key === '2')) {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '## ', '', 'Heading 2');
    onValueChange(newValue);
    setTimeout(() => { textarea.setSelectionRange(cursorStart, cursorEnd); textarea.focus(); }, 0);
    return true;
  }
  if (isCtrl && isShift && (event.code === 'Digit3' || event.key === '#' || event.key === '3')) {
    event.preventDefault();
    const { newValue, cursorStart, cursorEnd } = applyCommand(textarea, '### ', '', 'Heading 3');
    onValueChange(newValue);
    setTimeout(() => { textarea.setSelectionRange(cursorStart, cursorEnd); textarea.focus(); }, 0);
    return true;
  }

  // VS Code Line Insertions (Ctrl/Cmd + Enter and Ctrl/Cmd + Shift + Enter)
  if (isCtrl && event.key === 'Enter') {
    event.preventDefault();
    const val = textarea.value;
    const cursorPos = textarea.selectionStart;

    if (isShift) {
      // Ctrl + Shift + Enter: Insert line ABOVE current line
      let lineStart = val.lastIndexOf('\n', cursorPos - 1);
      lineStart = lineStart === -1 ? 0 : lineStart + 1;

      const newValue = val.substring(0, lineStart) + '\n' + val.substring(lineStart);
      onValueChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = lineStart;
        textarea.focus();
      }, 0);
    } else {
      // Ctrl + Enter: Insert line BELOW current line
      let lineEnd = val.indexOf('\n', cursorPos);
      lineEnd = lineEnd === -1 ? val.length : lineEnd;

      const newValue = val.substring(0, lineEnd) + '\n' + val.substring(lineEnd);
      onValueChange(newValue);

      setTimeout(() => {
        const nextPos = lineEnd + 1;
        textarea.selectionStart = textarea.selectionEnd = nextPos;
        textarea.focus();
      }, 0);
    }
    return true;
  }

  return false;
};
