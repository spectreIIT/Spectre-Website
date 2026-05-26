// ─── Professional Module Content Data ───────────────────────────────

export const STATIC_MODULE_CONTENT = {
  '1': {
    title: 'How HTTP Works',
    icon: '🌐',
    color: '#3b82f6',
    sections: [
      {
        id: 's1', type: 'theory', title: 'How HTTP Works',
        markdown: `
# What is HTTP?
HTTP (HyperText Transfer Protocol) is the foundation of the web. Every time you visit a website, your browser sends an HTTP request to the server, which replies with an HTTP response.

### Key Request Components
* **Method** – GET, POST, PUT, DELETE
* **URL** – the resource being requested
* **Headers** – metadata (cookies, content-type, auth tokens)
* **Body** – data sent with POST/PUT

### Status Codes to Remember
| Code | Meaning |
| :--- | :--- |
| 200 | OK |
| 301 | Moved Permanently |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

### Quick Test
Try checking your connectivity to a server using the ping command:

\`\`\`terminal
ping -c 4 google.com
curl -I https://www.google.com
\`\`\`

> Note: HTTPS adds TLS encryption on top of HTTP — always look for it in CTF challenges as intercepting plain HTTP traffic is trivial.

`
      },
      {
        id: 's2', type: 'theory', title: 'Cookies & Sessions',
        markdown: `
# Why Cookies Exist
Servers are stateless — they don't remember who you are between requests. Cookies solve this by storing small key-value pairs in your browser.

### Session Cookie Flow
1. You log in → server creates a session ID
2. Server sets a cookie: \`Set-Cookie: session=abc123\`
3. Your browser sends that cookie on every future request
4. Server looks up \`abc123\` in its session store to identify you

### Important Cookie Flags
* **HttpOnly** – JS cannot read the cookie (XSS protection)
* **Secure** – only sent over HTTPS
* **SameSite** – CSRF protection

### Practical Example
You can use \`curl\` to see cookies in the response headers:

\`\`\`terminal
curl -v https://example.com 2>&1 | grep "Set-Cookie"
\`\`\`

> Tip: In CTFs, look for insecure cookies with predictable values, missing flags, or JWT tokens with weak signing.

`
      },
      {
        id: 's3', type: 'challenge', title: 'Knowledge Check',
        questions: [
          { q: 'What HTTP method is typically used to submit a login form?', options: ['GET', 'POST', 'PUT', 'DELETE'], answer: 1 },
          { q: 'Which cookie flag prevents JavaScript from reading the cookie?', options: ['Secure', 'SameSite', 'HttpOnly', 'Encrypted'], answer: 2 },
          { q: "What status code means \"Forbidden — you don't have permission\"?", options: ['401', '403', '404', '500'], answer: 1 },
        ]
      }
    ]
  },
  '2': {
    title: 'Cryptography & Encoding',
    icon: '🔐',
    color: '#b026ff',
    sections: [
      {
        id: 's1', type: 'theory', title: 'Encoding vs Encryption vs Hashing',
        markdown: `
# Encoding vs Encryption vs Hashing

Operatives must understand the differences between these three core methods of data transformation:

| Transformation | Purpose | Key Property | Reversible? | Example |
| :--- | :--- | :--- | :--- | :--- |
| **Encoding** | Data compatibility | No secret key | Yes, easily | Base64, Hex |
| **Encryption** | Confidentiality | Requires a key | Yes, with key | AES, RSA |
| **Hashing** | Data integrity | One-way only | No | SHA-256, MD5 |

---

## 1. Encoding
Encoding transforms data into another format using a publicly available algorithm. It is **NOT** a security measure.

### Base64 Encoding
Base64 represents binary data in an ASCII string format. Let's encode a string in the terminal:

\`\`\`terminal
echo -n "SPECTRE" | base64
\`\`\`

To decode it:

\`\`\`terminal
echo -n "U1BFQ1RSRQ==" | base64 -d
\`\`\`

---

## 2. Encryption
Encryption scrambles data using a secret key, ensuring only authorized parties can read it.

> Note: Symmetric encryption (like AES) uses the same key for encryption and decryption. Asymmetric encryption (like RSA) uses a public key to encrypt and a private key to decrypt.

---

## 3. Hashing
Hashing takes an input and produces a fixed-size string (the hash) which is unique to that input. It is a one-way mathematical function.

\`\`\`terminal
echo -n "spectre_password" | sha256sum
\`\`\`

> Warning: Weak hashing algorithms like MD5 and SHA1 are vulnerable to collision attacks and fast cracking. Always use robust options like bcrypt or SHA-256 in production.
`
      },
      {
        id: 's2', type: 'theory', title: 'Classical Ciphers',
        markdown: `
# Classical Ciphers

Historically ciphers relied on secrecy of the algorithm. Let's inspect two classic examples.

## 1. Caesar Cipher (Shift Cipher)
The Caesar cipher is one of the simplest encryption techniques. It is a substitution cipher where each letter is replaced by a letter some fixed number of positions down the alphabet.

For a shift of 3:
* \`A\` becomes \`D\`
* \`B\` becomes \`E\`
* \`C\` becomes \`F\`

### Decrypting ROT13
ROT13 is a special case of Caesar cipher with a shift of 13. You can decrypt ROT13 in your terminal using the \`tr\` command:

\`\`\`terminal
echo "FCRPGER{pelcgb_vf_sha}" | tr 'A-Za-z' 'N-ZA-Mn-za-m'
\`\`\`

---

## 2. Vigenère Cipher
The Vigenère cipher is a method of encrypting alphabetic text by using a series of interwoven Caesar ciphers based on the letters of a keyword.

> Tip: Since it is a polyalphabetic substitution cipher, frequency analysis is harder than with a standard Caesar cipher. However, it is still easily broken using methods like the Kasiski examination.
`
      },
      {
        id: 's3', type: 'challenge', title: 'Cryptography Quiz',
        questions: [
          { q: 'Is Base64 encoding a secure method of protecting sensitive password data?', options: ['Yes, highly secure', 'Yes, but only with key', 'No, it is reversible without any key', 'Only on Linux'], answer: 2 },
          { q: 'Which cipher shifts letters in the alphabet by a fixed number of spaces?', options: ['Vigenère', 'RSA', 'Caesar', 'AES'], answer: 2 },
          { q: 'What property makes hashing distinct from encryption?', options: ['It uses a larger key', 'It is strictly one-way and non-reversible', 'It is faster to decode', 'It requires two keys'], answer: 1 }
        ]
      }
    ]
  },
  'model-1': {
    title: 'Intro to Databases',
    icon: '🗄️',
    color: '#00f0ff',
    sections: [
      {
        id: 's1', type: 'theory', title: 'Database Management Systems',
        markdown: `
# Intro to Databases
Before we learn about SQL injections, we need to learn more about databases and Structured Query Language (SQL). Web applications utilize back-end databases to store various content and information.

## Database Management Systems
A DBMS helps create, define, host, and manage databases. Some of the essential features include:

| Feature | Description |
| :--- | :--- |
| **Concurrency** | Multiple users interacting simultaneously without data loss. |
| **Consistency** | Ensuring data remains valid throughout the database. |
| **Security** | Fine-grained security controls through user authentication. |

## Architecture
The diagram below details a two-tiered architecture.

![Architecture](https://academy.hackthebox.com/storage/modules/34/architecture.png)

\`Tier I\` consists of client-side applications (websites/GUIs). \`Tier II\` is the middleware that interprets events and sends them to the DBMS.

### Checking DBMS Status
You can check if the MySQL service is running using:

\`\`\`terminal
systemctl status mysql
\`\`\`

`
      },
      {
        id: 's2', type: 'theory', title: 'Interacting with MySQL',
        markdown: `
# Command Line Interaction
To interact with a MySQL database, we often use the command line:

\`\`\`terminal
mysql -u root -p<password>
\`\`\`

> Tip: There shouldn't be any spaces between '-p' and the password.

### Connection Parameters
* \`-u\`: Username
* \`-h\`: Hostname (defaults to localhost)
* \`-P\`: Port (defaults to 3306)

\`\`\`terminal
mysql -u root -h docker.hackthebox.eu -P 3306 -p
\`\`\`
`
      }
    ]
  },
  'design-showcase': {
    title: 'SPECTRE Design Showcase',
    icon: '🎨',
    color: '#a855f7',
    sections: [
      {
        id: 'ds1', type: 'theory', title: 'The SPECTRE Design System',
        markdown: `
# Design System Showcase
Welcome to the SPECTRE Learning Interface. This module is designed to showcase every rich-text feature available in our professional LMS engine.

## 1. Typography & Hierarchy
You can use standard Markdown for headings, **bold text**, *italicized text*, and even ~~strikethrough~~. This allows for clear, hierarchical content structuring.

### Lists
* Bulleted items for features
* Nested items work too
  * Sub-item one
  * Sub-item two
1. Numbered lists for procedures
2. Step-by-step instructions

## 2. Professional Info Boxes
Use these to highlight critical information, provide extra tips, or warn users about common pitfalls.

> Tip: This is a tip box. Use it for "Pro-tips" or helpful shortcuts that enhance the learning experience.

> Note: This is a general note box. Use it for background information or context that isn't strictly part of the main procedure.

> Warning: This is a warning box. Use it for security risks, destructive commands, or critical errors to avoid.

## 3. Data Visualization
Tables are automatically styled with a clean, high-contrast theme, perfect for comparing protocols or data structures.

| Protocol | Port | Description | Security |
| :--- | :--- | :--- | :--- |
| HTTP | 80 | Web Traffic | Insecure |
| HTTPS | 443 | Secure Web | TLS Encrypted |
| SSH | 22 | Remote Shell | Encrypted |
| FTP | 21 | File Transfer | Insecure |

## 4. Code & Terminal Interaction
This is where the Spectre engine shines. We support both standard syntax highlighting and specialized terminal blocks.

### Terminal Blocks
For command-line exercises, use the \`terminal\` language tag. It adds a professional shell prompt automatically.

\`\`\`terminal
nmap -sV -sC -Pn 10.10.10.123
cat /etc/passwd | grep "/bin/bash"
whoami
\`\`\`

### Syntax Highlighting
For scripts or configuration files, use standard language tags like \`javascript\`, \`python\`, or \`html\`.

\`\`\`javascript
const hacker = {
  name: 'Spectre',
  status: 'Infiltrating',
  xp: 9001
};
console.log(\`User \${hacker.name} is \${hacker.status}\`);
\`\`\`

## 5. Media & Assets
Images are centered, bordered, and support captions to ensure technical diagrams look professional.

![Global Threat Map](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000)
*Example of a high-resolution threat map visualization.*

---
### Next Steps
Now that you've seen the power of the SPECTRE engine, you can proceed to the next section to see how interactive quizzes are handled!
`
      },
      {
        id: 'ds2', type: 'challenge', title: 'Knowledge Verification',
        questions: [
          { q: 'Which tag is used to create a professional terminal block in our system?', options: ['shell', 'terminal', 'bash', 'cmd'], answer: 1 },
          { q: 'How do you create a "Tip" box in Markdown?', options: ['[TIP] text', '> Tip: text', '!! Tip text', '::: tip'], answer: 1 },
          { q: 'Does our system support automatic syntax highlighting for JavaScript?', options: ['Yes, fully supported', 'No, only terminal', 'Only for HTML', 'Requires manual CSS'], answer: 0 },
        ]
      }
    ]
  }
};
