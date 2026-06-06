/**
 * Modular Markdown Parser for Spectre CTF Editor
 */

export const escapeHTML = (text) => {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Callout / Alert Box Renderer
 * Supports standard types (NOTE, WARNING, IMPORTANT, FLAG, PAYLOAD, TIP, INFO)
 * and ANY custom labels. Guarantees all content stays INSIDE the container.
 */
export const parseAlertBoxes = (html) => {
  const CALLOUT_TYPES = {
    NOTE: { label: 'Note', icon: 'ℹ️', color: '#c084fc', border: '#a855f7', bg: 'rgba(168, 85, 247, 0.02)' },
    WARNING: { label: 'Warning', icon: '⚠️', color: '#f87171', border: '#ef4444', bg: 'rgba(239, 68, 68, 0.02)' },
    IMPORTANT: { label: 'Important', icon: '🚨', color: '#0d9488', border: '#0d9488', bg: 'rgba(13, 148, 136, 0.02)' },
    FLAG: { label: 'Flag Found', icon: '🏁', color: '#fbbf24', border: '#eab308', bg: 'rgba(234, 179, 8, 0.02)' },
    PAYLOAD: { label: 'Exploit Payload', icon: '💾', color: '#60a5fa', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.02)' },
    TIP: { label: 'Pro Tip', icon: '💡', color: '#34d399', border: '#10b981', bg: 'rgba(16, 185, 129, 0.02)' },
    INFO: { label: 'System Info', icon: '🔵', color: '#22d3ee', border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.02)' }
  };

  const lines = html.split('\n');
  const resultLines = [];
  let inCallout = false;
  let calloutType = '';
  let calloutContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line starts with `&gt; [!LABEL]`
    const match = trimmed.match(/^&gt;\s*\[!([^\]]+)\]/i);

    if (match) {
      if (inCallout) {
        resultLines.push(renderCallout(calloutType, calloutContent.join('\n'), CALLOUT_TYPES));
        calloutContent = [];
      }
      inCallout = true;
      calloutType = match[1];
      const afterLabel = trimmed.replace(/^&gt;\s*\[![^\]]+\]/, '').trim();
      if (afterLabel) {
        calloutContent.push(afterLabel);
      }
    } else if (inCallout && (trimmed.startsWith('&gt;') || trimmed === '&gt;')) {
      let contentLine = trimmed.substring(4); // strip `&gt;`
      if (contentLine.startsWith(' ')) {
        contentLine = contentLine.substring(1);
      }
      calloutContent.push(contentLine);
    } else {
      if (inCallout) {
        resultLines.push(renderCallout(calloutType, calloutContent.join('\n'), CALLOUT_TYPES));
        inCallout = false;
        calloutContent = [];
      }
      resultLines.push(line);
    }
  }

  if (inCallout) {
    resultLines.push(renderCallout(calloutType, calloutContent.join('\n'), CALLOUT_TYPES));
  }

  return resultLines.join('\n');
};

const renderCallout = (type, content, CALLOUT_TYPES) => {
  let label = type;
  let color = '#c084fc';
  let border = '#a855f7';
  let bg = 'rgba(168, 85, 247, 0.02)';
  let icon = '📌';

  if (type.includes('|')) {
    const parts = type.split('|');
    const firstPart = parts[0].trim().toUpperCase();

    if (firstPart === 'STEP') {
      const stepNum = parts[1] ? parts[1].trim() : '1';
      const stepTitle = parts[2] ? parts[2].trim() : 'Step';
      return `
        <div class="step-card" style="background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.03); border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; display: flex; gap: 12px; align-items: flex-start;">
          <div class="step-number" style="width: 22px; height: 22px; border-radius: 50%; background: #a855f7; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.75rem; flex-shrink: 0; margin-top: 2px;">${stepNum}</div>
          <div class="step-content" style="flex: 1;">
            <h4 style="color: #fff; margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 600;">${stepTitle}</h4>
            <p style="color: #94a3b8; margin: 0; font-size: 0.85rem; line-height: 1.5; white-space: pre-wrap; word-break: break-word;">${content}</p>
          </div>
        </div>
      `;
    }

    label = parts[0].trim();
    color = parts[1] ? parts[1].trim() : '#c084fc';
    icon = parts[2] ? parts[2].trim() : '📌';
    border = color;
    bg = `color-mix(in srgb, ${color} 10%, transparent)`;
  } else {
    const upperType = type.toUpperCase();
    const config = CALLOUT_TYPES[upperType] || {
      label: type.replace(/[-_]/g, ' '),
      icon: '📌',
      color: '#c084fc',
      border: '#a855f7',
      bg: 'rgba(168, 85, 247, 0.02)'
    };
    label = config.label;
    color = config.color;
    border = config.border;
    bg = config.bg;
    icon = config.icon;
  }

  return `
    <div class="custom-callout-box" style="background: ${bg}; border-left: 4px solid ${border}; padding: 16px 20px; border-radius: 8px; margin: 18px 0; border-top: 1px solid rgba(255,255,255,0.02); border-right: 1px solid rgba(255,255,255,0.02); border-bottom: 1px solid rgba(255,255,255,0.02); box-shadow: 0 4px 20px rgba(0,0,0,0.25); color: #cbd5e1; line-height: 1.6; font-size: 0.88rem; backdrop-filter: blur(12px);">
      <div style="color: ${color}; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.5px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; user-select: none;">
        <span style="font-size: 1rem;">${icon}</span>
        <span>${label}</span>
      </div>
      <div style="font-family: inherit; font-size: 0.88rem; line-height: 1.6; color: #cbd5e1; white-space: pre-wrap; word-break: break-word;">${content}</div>
    </div>
  `;
};

/**
 * Terminal Block Renderer
 * Renders a premium interactive console execution panel looking EXACTLY like the image.
 * Centered bash header label, vivid macOS window controls on the left, green command prompts.
 */
const renderTerminalBlock = (cleanCode) => {
  const lines = cleanCode.split('\n').map(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('$')) {
      const cmd = trimmedLine.substring(1).trim();
      if (cmd === '') {
        return `
          <div class="terminal-line command-line" style="display: flex; align-items: flex-start; margin: 4px 0; font-family: 'Fira Code', monospace; font-size: 0.9rem; line-height: 1.6;">
            <span class="terminal-prompt" style="color: #27c93f; margin-right: 12px; font-weight: bold; user-select: none;">$</span>
          </div>
        `;
      }
      return `
        <div class="terminal-line command-line" style="display: flex; align-items: flex-start; margin: 4px 0; font-family: 'Fira Code', monospace; font-size: 0.9rem; line-height: 1.6;">
          <span class="terminal-prompt" style="color: #27c93f; margin-right: 12px; font-weight: bold; user-select: none;">$</span>
          <span class="terminal-command" style="color: #cbd5e1; font-weight: 500; font-family: 'Fira Code', monospace;">${escapeHTML(cmd)}</span>
        </div>
      `;
    } else {
      return `
        <div class="terminal-line output-line" style="display: flex; align-items: flex-start; margin: 2px 0 2px 20px; font-family: 'Fira Code', monospace; font-size: 0.88rem; color: #94a3b8; line-height: 1.6; white-space: pre-wrap;">${escapeHTML(line)}</div>
      `;
    }
  }).join('');

  return `
    <div class="premium-terminal-block" style="background: #090a10; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; margin: 18px 0; overflow: hidden; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);">
      <div class="terminal-header" style="background: #18191f; height: 38px; display: flex; align-items: center; justify-content: center; position: relative; border-bottom: 1px solid rgba(255, 255, 255, 0.04); padding: 0 16px;">
        <div style="position: absolute; left: 16px; display: flex; gap: 7px;">
          <span style="width: 11px; height: 11px; border-radius: 50%; background: #ff5f56; display: inline-block;"></span>
          <span style="width: 11px; height: 11px; border-radius: 50%; background: #ffbd2e; display: inline-block;"></span>
          <span style="width: 11px; height: 11px; border-radius: 50%; background: #27c93f; display: inline-block;"></span>
        </div>
        <span style="color: #8e9cae; font-size: 0.8rem; font-family: 'Fira Code', monospace; font-weight: 500; letter-spacing: 0.5px; user-select: none;">bash</span>
      </div>
      <div class="terminal-body" style="padding: 20px; background: #07080c; min-height: 80px; overflow-x: auto; text-align: left;">
        ${lines}
      </div>
    </div>
  `;
};

/**
 * Code Block Renderer
 * Renders a clean VSCode/GitHub source editor block matching the reference image.
 * Left side: < /> [LANG_NAME]
 * Right side: Only the overlapping double-square copy icon.
 * Features strict styling resets to bypass global CSS bubble backgrounds.
 */
const renderCodeBlock = (displayLang, cleanCode) => {
  const escapedCode = escapeHTML(cleanCode);
  const encodedCode = encodeURIComponent(cleanCode);
  return `
    <div class="premium-code-block" style="background: #121318; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 8px; margin: 18px 0; overflow: hidden; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);">
      <div class="code-block-header" style="background: #18191f; height: 42px; display: flex; justify-content: space-between; align-items: center; padding: 0 18px; user-select: none;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.9;">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span style="color: #fff; font-size: 0.65rem; font-family: system-ui, -apple-system, sans-serif; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
            ${displayLang}
          </span>
        </div>
        <div style="display: flex; align-items: center;">
          <button class="copy-code-btn" data-code="${encodedCode}" style="background: transparent; border: none; padding: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #94a3b8; transition: all 0.2s; border-radius: 4px;" onmouseover="this.style.color='#fff'; this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.color='#94a3b8'; this.style.background='transparent'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      </div>
      <pre style="margin: 0; padding: 18px; background: #18191f; overflow-x: auto; max-height: 400px; scrollbar-width: thin; text-align: left;"><code style="display: block !important; background: transparent !important; padding: 0 !important; border: none !important; border-radius: 0 !important; color: #e2e8f0; font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace; font-size: 0.6rem; line-height: 1.6; white-space: pre;">${escapedCode}</code></pre>
    </div>
  `;
};

export const parseCodeBlocks = (html) => {
  return html.replace(/```(\w*)\n([\s\S]*?)```/gm, (match, lang, code) => {
    const cleanCode = code.trim();
    const displayLang = lang ? lang.toLowerCase() : 'code';

    const isTerminal = displayLang === 'terminal' ||
      displayLang === 'bash' ||
      displayLang === 'sh' ||
      displayLang === 'shell' ||
      displayLang === 'cmd' ||
      cleanCode.startsWith('$');

    if (isTerminal) {
      return renderTerminalBlock(cleanCode);
    } else {
      return renderCodeBlock(displayLang, cleanCode);
    }
  });
};

export const parseTerminalLines = (html) => {
  const lines = html.split('\n');
  const resultLines = [];
  let inTerminalGroup = false;
  let terminalContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip wrapping tags and HTML blocks to keep parsed code and callouts clean
    if (
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('</div') ||
      trimmed.startsWith('</pre') ||
      trimmed.startsWith('<h') ||
      trimmed.startsWith('</h')
    ) {
      if (inTerminalGroup) {
        resultLines.push(renderTerminalBlock(terminalContent.join('\n')));
        inTerminalGroup = false;
        terminalContent = [];
      }
      resultLines.push(line);
      continue;
    }

    if (trimmed.startsWith('$') || trimmed.startsWith('&gt; $')) {
      if (!inTerminalGroup) {
        inTerminalGroup = true;
        terminalContent = [];
      }
      terminalContent.push(trimmed);
    } else {
      if (inTerminalGroup) {
        resultLines.push(renderTerminalBlock(terminalContent.join('\n')));
        inTerminalGroup = false;
        terminalContent = [];
      }
      resultLines.push(line);
    }
  }

  if (inTerminalGroup) {
    resultLines.push(renderTerminalBlock(terminalContent.join('\n')));
  }

  return resultLines.join('\n');
};

export const parseTable = (block) => {
  let blockWidth = 'max-content'; // Default to max-content to keep 2-column tables compact
  if (block.match(/{width:\s*([^}]+)}/)) {
    const match = block.match(/{width:\s*([^}]+)}/);
    blockWidth = match[1].trim();
    block = block.replace(match[0], '');
  }

  const lines = block.split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return block; // Not a valid table

  // Dynamically find the separator row to support multi-level headers
  let sepIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    const rowContent = lines[i].slice(1, -1).replace(/\|/g, '').trim();
    if (rowContent !== '' && rowContent.replace(/:/g, '').replace(/-/g, '').replace(/\s/g, '') === '') {
      sepIdx = i;
      break;
    }
  }

  // If no valid separator row found, return raw block
  if (sepIdx === -1) return block;

  const headerLines = lines.slice(0, sepIdx);
  const alignmentRow = lines[sepIdx].split('|').slice(1, -1).map(a => a.trim());
  const dataLines = lines.slice(sepIdx + 1);

  const alignments = alignmentRow.map(a => {
    if (a.startsWith(':') && a.endsWith(':')) return 'center';
    if (a.endsWith(':')) return 'right';
    return 'left'; // default
  });

  const parseRow = (line, isHeader) => {
    const cells = line.split('|').slice(1, -1);
    let rowHtml = `<tr style="transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">`;
    
    let skip = 0;
    const processedCells = [];
    for (let i = 0; i < cells.length; i++) {
      if (skip > 0) {
        skip--;
        continue;
      }
      
      let content = cells[i].trim();
      let colspan = 1;

      // Check for explicit colspan like colspan=2
      const colSpanMatch = content.match(/colspan=["']?([0-9]+)["']?/i);
      if (colSpanMatch) {
        colspan = parseInt(colSpanMatch[1], 10);
        content = content.replace(colSpanMatch[0], '').trim();
        skip = colspan - 1; // Skip the next dummy columns if they provided them
      } else if (cells[i] === '' && processedCells.length > 0) {
        // Implicit merge using ||
        processedCells[processedCells.length - 1].colspan += 1;
        continue;
      }

      processedCells.push({ content, colspan, align: alignments[i] || 'left' });
    }

    processedCells.forEach((cell) => {
      const tag = isHeader ? 'th' : 'td';
      const colSpanAttr = cell.colspan > 1 ? ` colspan="${cell.colspan}"` : '';
      const textAlignment = isHeader && cell.colspan > 1 ? 'center' : cell.align;
      const style = isHeader 
        ? `padding: 10px 12px; font-weight: 700; text-align: ${textAlignment}; color: #fff; border: 1px solid rgba(255,255,255,0.1); border-bottom: 2px solid rgba(255,255,255,0.15);` 
        : `padding: 8px 12px; text-align: ${textAlignment}; border: 1px solid rgba(255,255,255,0.1);`;
      rowHtml += `<${tag} style="${style}"${colSpanAttr}>${cell.content}</${tag}>`;
    });
    rowHtml += `</tr>`;
    return rowHtml;
  };

  let html = `<div style="overflow-x: auto; margin: 16px 0; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); width: ${blockWidth}; max-width: 100%;"><table style="width: 100%; border-collapse: collapse; text-align: left; background: transparent; color: #e2e8f0; font-size: 0.85rem;">`;
  
  html += `<thead>`;
  headerLines.forEach(line => {
    html += parseRow(line, true);
  });
  html += `</thead><tbody>`;
  
  dataLines.forEach(line => {
    html += parseRow(line, false);
  });
  html += `</tbody></table></div>`;

  return html;
};

export const parseHeaders = (html) => {
  html = html.replace(/^###\s+(.*)$/gm, '<h3 style="color: #e2e8f0; font-size: 1.15rem; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08) !important; padding-bottom: 8px !important; font-weight: 600;">$1</h3>');
  html = html.replace(/^##\s+(.*)$/gm, '<h2 style="color: #fff; font-size: 1.35rem; margin-top: 28px; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.12) !important; padding-bottom: 10px !important; font-weight: 700;">$1</h2>');
  html = html.replace(/^#\s+(.*)$/gm, '<h1 style="color: #fff; font-size: 1.65rem; margin-top: 32px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.15) !important; padding-bottom: 12px !important; font-weight: 800;">$1</h1>');
  return html;
};

export const parseTextStyles = (html) => {
  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff; font-weight: 700;">$1</strong>');

  // Italic (*text*) - Normal Font Weight enforced to avoid semi-bold issues
  html = html.replace(/\*(.*?)\*/g, '<em style="color: #cbd5e1; font-style: italic; font-weight: normal !important; display: inline;">$1</em>');

  // Premium Underline (<u>text</u>)
  html = html.replace(/(?:&lt;u&gt;|<u>)(.*?)(?:&lt;\/u&gt;|<\/u>)/gi, '<span style="border-bottom: 1px solid #fff; padding-bottom: 1px; color: #fff; font-weight: inherit;">$1</span>');

  // Lightweight Monospace Inline Code (`code`)
  html = html.replace(/`(.*?)`/g, '<code class="spectre-inline-code" style="background: rgba(255, 255, 255, 0.05); color: #c084fc; padding: 2px 5px; border-radius: 4px; font-family: \'Fira Code\', monospace; font-size: 0.82rem; border: 1px solid rgba(255, 255, 255, 0.05); margin: 0 2px; vertical-align: middle;">$1</code>');

  // Images (![alt|width](url) or ![alt](url))
  // Must run before Links to avoid matching the brackets.
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (match, altData, url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.match(/^(https?:\/\/|\/\/|data:image)/i)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    
    let alt = altData;
    let width = '100%';
    let height = 'auto';
    
    // Custom syntax for sizing: ![Alt Text|500] or ![Alt Text|500x300]
    if (altData.includes('|')) {
      const parts = altData.split('|');
      alt = parts[0];
      const size = parts[1].trim();
      if (size.includes('x')) {
        const dims = size.split('x');
        width = dims[0] + (dims[0].includes('%') || dims[0].includes('px') ? '' : 'px');
        height = dims[1] + (dims[1].includes('%') || dims[1].includes('px') ? '' : 'px');
      } else {
        width = size + (size.includes('%') || size.includes('px') ? '' : 'px');
      }
    }

    return `<img src="${cleanUrl}" alt="${alt}" style="max-width: 100%; width: ${width}; height: ${height}; border-radius: 8px; margin: 16px 0; border: 1px solid rgba(255,255,255,0.1); display: block;" />`;
  });

  // Links ([label](url))
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (match, label, url) => {
    let cleanUrl = url.trim();
    if (!cleanUrl.match(/^(https?:\/\/|\/\/|mailto:|tel:)/i)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: #a855f7; text-decoration: none; border-bottom: 1px dashed #a855f7; font-weight: 500; transition: all 0.2s;" onmouseover="this.style.color='#c084fc'; this.style.borderBottomStyle='solid'" onmouseout="this.style.color='#a855f7'; this.style.borderBottomStyle='dashed'">${label}</a>`;
  });

  return html;
};

export const parseMarkdownToHTML = (md) => {
  if (!md) return '<p style="color: #64748b; font-style: italic; text-align: center; padding: 20px 0;">Nothing to preview yet...</p>';

  // 1. Escape HTML first
  let escaped = escapeHTML(md);

  // 1.5. Pre-process headers to ensure they become their own blocks
  const rawLines = escaped.split('\n');
  let inCodePre = false;
  for (let i = 0; i < rawLines.length; i++) {
    const trimmedLine = rawLines[i].trim();
    if (trimmedLine.startsWith('```')) {
      inCodePre = !inCodePre;
    } else if (!inCodePre) {
      if (trimmedLine.match(/^#{1,3}\s+/)) {
        rawLines[i] = `\n\n${rawLines[i]}\n\n`;
      }
    }
  }
  escaped = rawLines.join('\n').replace(/\n{3,}/g, '\n\n');

  // 2. Parse Markdown blocks (split by double newlines) to safely wrap paragraphs
  // without fragmenting inner lines of code blocks or lists.
  const blocks = escaped.split(/\n\n+/);
  let inFencedCode = false;
  const parsedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';

    // Check if this block opens or closes a fenced code block
    const fenceMatches = (block.match(/```/g) || []).length;
    if (fenceMatches % 2 !== 0) {
      inFencedCode = !inFencedCode;
      return block; // part of a fenced code block, keep intact
    }
    if (inFencedCode || trimmed.startsWith('```')) {
      return block; // fully inside or starts/ends a fenced code block, keep intact
    }

    if (trimmed.startsWith('&gt;') || trimmed.startsWith('>') || trimmed.startsWith('$')) {
      return block;
    }

    // Process headers at block level
    if (trimmed.match(/^#{1,3}\s+/)) {
      return parseHeaders(trimmed);
    }

    // Process tables
    if (trimmed.startsWith('|') && trimmed.includes('\n|') && trimmed.includes('---')) {
      const parsedTable = parseTable(trimmed);
      if (parsedTable !== trimmed) {
        return parsedTable;
      }
    }

    // Wrap normal text paragraphs, converting single newlines to line breaks
    const content = block.split('\n').join('<br />');
    return `<p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 16px; margin-top: 0;">${content}</p>`;
  });

  let html = parsedBlocks.join('\n\n');

  // 3. Process fenced code blocks
  html = parseCodeBlocks(html);

  // 4. Process custom alert boxes
  html = parseAlertBoxes(html);

  // 5. Process grouped terminal commands
  html = parseTerminalLines(html);

  // 6. Process inline text styles (bold, italic, underline, links)
  html = parseTextStyles(html);

  return html;
};
