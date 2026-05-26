/**
 * Action groupings and commands definition for Spectre Editor Toolbar
 */

export const ACTION_GROUPS = {
  FORMATTING: 'Text Formatting',
  MEDIA: 'Media',
  CODE: 'Code',
  CALLOUTS: 'Callouts'
};

export const TOOLBAR_ACTIONS = [
  // Formatting
  {
    id: 'bold',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Bold',
    before: '**',
    after: '**',
    defaultText: 'bold text',
    shortcut: 'Ctrl+B'
  },
  {
    id: 'italic',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Italic',
    before: '*',
    after: '*',
    defaultText: 'italic text',
    shortcut: 'Ctrl+I'
  },
  {
    id: 'underline',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Underline',
    before: '<u>',
    after: '</u>',
    defaultText: 'underlined text',
    shortcut: 'Ctrl+U'
  },
  {
    id: 'heading1',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Heading 1',
    before: '# ',
    after: '',
    defaultText: 'Heading 1',
    shortcut: 'Ctrl+Shift+1'
  },
  {
    id: 'heading2',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Heading 2',
    before: '## ',
    after: '',
    defaultText: 'Heading 2',
    shortcut: 'Ctrl+Shift+2'
  },
  {
    id: 'heading3',
    group: ACTION_GROUPS.FORMATTING,
    label: 'Heading 3',
    before: '### ',
    after: '',
    defaultText: 'Heading 3',
    shortcut: 'Ctrl+Shift+3'
  },
  
  // Media
  {
    id: 'link',
    group: ACTION_GROUPS.MEDIA,
    label: 'Link',
    before: '[',
    after: '](https://example.com)',
    defaultText: 'Link Text',
    shortcut: 'Ctrl+K'
  },
  {
    id: 'image',
    group: ACTION_GROUPS.MEDIA,
    label: 'Image',
    before: '![',
    after: '](https://example.com/image.png)',
    defaultText: 'Image Description',
    shortcut: 'Ctrl+Shift+I'
  },

  // Code
  {
    id: 'inlineCode',
    group: ACTION_GROUPS.CODE,
    label: 'Inline Code',
    before: '`',
    after: '`',
    defaultText: 'code',
    shortcut: 'Ctrl+E'
  },
  {
    id: 'codeBlock',
    group: ACTION_GROUPS.CODE,
    label: 'Code Block',
    before: '```javascript\n',
    after: '\n```',
    defaultText: '// your code here',
    shortcut: 'Ctrl+Shift+C'
  },
  {
    id: 'terminalBlock',
    group: ACTION_GROUPS.CODE,
    label: 'Terminal Block',
    before: '$ ',
    after: '',
    defaultText: 'ping -c 4 google.com',
    shortcut: 'Ctrl+Shift+K'
  },

  // Callouts
  {
    id: 'dynamicAlert',
    group: ACTION_GROUPS.CALLOUTS,
    label: 'Dynamic Alert',
    before: '> [!Dynamic Alert|#a855f7|📌]\n> ',
    after: '',
    defaultText: 'Enter your custom alert content here...',
    shortcut: 'Ctrl+Shift+A'
  },
  {
    id: 'stepCard',
    group: ACTION_GROUPS.CALLOUTS,
    label: 'Step Card',
    before: '> [!STEP|1|Step Title]\n> ',
    after: '',
    defaultText: 'Enter step description here...',
    shortcut: 'Ctrl+Shift+S'
  }
];
