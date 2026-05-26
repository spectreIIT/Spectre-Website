/**
 * Categorized CTF Walkthrough Templates
 */

export const CATEGORIES = {
  WEB: 'Web Exploitation',
  PWN: 'Pwn & Binary',
  CRYPTO: 'Cryptography'
};

export const TEMPLATES = [
  {
    id: 'web-xss',
    category: CATEGORIES.WEB,
    label: 'DOM-based XSS Walkthrough',
    description: 'Perfect for reflecting dynamic inputs inside front-end rendering engines or innerHTML templates.',
    content: `# Web Walkthrough: DOM XSS

## Overview
The challenge exposed an unsanitized reflection parameter inside client-side templates.

> [!NOTE]
> The target parameter is reflected inside a JavaScript template string.

## Step-by-Step Solve

### 1. Identify context
Locate where input lands in browser debugger.
$ curl -s "http://target.ctf/search?q=test"

### 2. Craft payload
\`\`\`javascript
const payload = '<img src=x onerror=alert(document.domain)>';
location.hash = encodeURIComponent(payload);
\`\`\`
`
  },
  {
    id: 'web-sqli',
    category: CATEGORIES.WEB,
    label: 'SQL Injection Bypass',
    description: 'Template for detailing structured database authentication bypasses or union-based extraction payloads.',
    content: `# Web Walkthrough: SQL Injection Bypass

## Overview
The backend application lacks parameterized binding for form inputs, enabling raw query structure injections.

> [!IMPORTANT]
> The query executes directly without typecasting or escaping parameters.

## Step-by-Step Solve

### 1. Detect Injection
Check if error responses are triggered by database characters:
$ curl -s -X POST -d "username=admin'--" http://target.ctf/login

### 2. Extract Data
\`\`\`sql
' UNION SELECT null, username, password FROM users --
\`\`\`
`
  },
  {
    id: 'pwn-overflow',
    category: CATEGORIES.PWN,
    label: 'Buffer Overflow Escalate',
    description: 'Perfect stack/buffer redirect ROP payload solver layout.',
    content: `# Exploit Walkthrough: Stack Overflow

## Overview
Classic stack-based buffer overflow allowing instruction redirect control shell.

> [!WARNING]
> This target has NX enabled, requiring Return Oriented Programming (ROP).

## Exploitation Steps
$ checksec ./vuln_elf

### Shell Script Solve:
\`\`\`bash
gcc exploit.c -o exploit
./exploit
whoami
\`\`\`
`
  },
  {
    id: 'crypto-wiener',
    category: CATEGORIES.CRYPTO,
    label: 'Wiener RSA Attack',
    description: 'A mathematics continued fraction algorithm layout for low-density exponents.',
    content: `# Solver Walkthrough: Modular Inverse RSA

## Overview
Bypassing prime key limits using Wiener's continued fractions.

> [!IMPORTANT]
> Wiener's attack requires the private exponent exponent d < N^0.25.

## Mathematical Formulation
Recover key parameter convergent list.
\`\`\`python
from sympy import continued_fraction_convergents
# Factoring key N...
d = 1279321
\`\`\`
`
  }
];
