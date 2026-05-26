import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Challenge from './models/Challenge.js';

dotenv.config();

const challenges = [
  {
    title: 'Undo',
    description: 'Can you reverse a series of Linux text transformations to recover the original flag?',
    category: 'General Skills',
    difficulty: 'Easy',
    points: 100,
    author: 'Yahaya Meddy',
    hints: [
      { text: 'Look into the "rev" command.' },
      { text: 'The flag is in the standard format SPECTRE{...}' }
    ],
    files: [
      { name: 'challenge_files.zip', url: '#', size: '1.2 MB', type: 'file' },
      { name: 'http://web-chal.spectre.local:8080', url: 'http://web-chal.spectre.local:8080', type: 'link' }
    ],
    flag: 'SPECTRE{linux_is_awesome}',
    isInstance: false
  },
  {
    title: 'SQLi Basic',
    description: 'The login page is vulnerable to SQL injection. Can you bypass it?',
    category: 'Web',
    difficulty: 'Easy',
    points: 100,
    author: 'Admin',
    hints: [
      { text: "Try ' OR '1'='1" }
    ],
    flag: 'SPECTRE{sqli_is_not_dead}',
    isInstance: false
  },
  {
    title: 'Easy XOR',
    description: 'XOR is the bread and butter of cryptography. Can you decode this message?',
    category: 'Crypto',
    difficulty: 'Easy',
    points: 50,
    author: 'Yahaya Meddy',
    hints: [
      { text: "The key is a single byte." }
    ],
    flag: 'SPECTRE{xor_is_simple_right}',
    isInstance: false
  },
  {
    title: 'Meta Secret',
    description: 'Sometimes the secret is hidden in plain sight, or rather, in the metadata.',
    category: 'Forensics',
    difficulty: 'Medium',
    points: 150,
    author: 'Admin',
    hints: [
      { text: "Exiftool might be your best friend here." }
    ],
    flag: 'SPECTRE{metadata_never_lies}',
    isInstance: false
  },
  {
    title: 'Baby Pwn',
    description: 'Can you overflow a simple buffer to overwrite a local variable?',
    category: 'Pwn',
    difficulty: 'Easy',
    points: 100,
    author: 'Meddy',
    hints: [
      { text: "Check the size of the buffer and the input." }
    ],
    flag: 'SPECTRE{overflow_the_buffer}',
    isInstance: false
  },
  {
    title: 'Kernel Panic',
    description: 'A deep dive into kernel-mode exploitation. Can you escalate your privileges?',
    category: 'Pwn',
    difficulty: 'Advanced',
    points: 500,
    author: 'SpectreAdmin',
    hints: [
      { text: "Look into slab allocation." }
    ],
    flag: 'SPECTRE{kernel_master_exploiter}',
    isInstance: false
  },
  {
    title: 'The Enigma Code',
    description: 'This is not your average substitution cipher. This is history.',
    category: 'Crypto',
    difficulty: 'Expert',
    points: 1000,
    author: 'Yahaya Meddy',
    hints: [
      { text: "Three rotors, one reflector." }
    ],
    flag: 'SPECTRE{enigma_decoded_1945}',
    isInstance: false
  },
  {
    title: 'Buffer Overflow Basic',
    description: 'Bypass a local comparison check by writing past the bounds of a stack buffer.',
    category: 'Pwn',
    difficulty: 'Medium',
    points: 150,
    author: 'Admin',
    hints: [
      { text: 'Look at the gets() call.' }
    ],
    flag: 'SPECTRE{basic_stack_overwrite_accomplished}',
    isInstance: false
  },
  {
    title: 'SQLi Advanced',
    description: 'This database input uses sanitization filters, but they are incomplete. Bypass it!',
    category: 'Web',
    difficulty: 'Hard',
    points: 250,
    author: 'Admin',
    hints: [
      { text: 'Try double encoding your quotes.' }
    ],
    flag: 'SPECTRE{advanced_injection_complete}',
    isInstance: false
  },
  {
    title: 'Command Injection',
    description: 'Execute arbitrary commands on the system by chaining shell operators in the input field.',
    category: 'Web',
    difficulty: 'Easy',
    points: 100,
    author: 'Meddy',
    hints: [
      { text: 'Try using a semicolon or pipe symbol.' }
    ],
    flag: 'SPECTRE{cmd_injection_expert}',
    isInstance: false
  },
  {
    title: 'Zip Cracking',
    description: 'A zip archive is protected with a weak, common password. Can you brute-force it?',
    category: 'Forensics',
    difficulty: 'Easy',
    points: 50,
    author: 'Admin',
    hints: [
      { text: 'Use rockyou.txt wordlist.' }
    ],
    flag: 'SPECTRE{weak_passwords_are_dangerous}',
    isInstance: false
  },
  {
    title: 'Directory Traversal',
    description: 'Retrieve the /etc/passwd file from the server using relative path traversal paths.',
    category: 'Web',
    difficulty: 'Easy',
    points: 100,
    author: 'Meddy',
    hints: [
      { text: 'Think dot-dot-slash.' }
    ],
    flag: 'SPECTRE{relative_path_traversal_success}',
    isInstance: false
  },
  {
    title: 'AES Decryption',
    description: 'A message was encrypted using AES-CBC, but the initialization vector is reused. Decrypt it!',
    category: 'Crypto',
    difficulty: 'Medium',
    points: 200,
    author: 'Yahaya Meddy',
    hints: [
      { text: 'IV reuse ruins confidentiality.' }
    ],
    flag: 'SPECTRE{aes_cbc_iv_reused_fail}',
    isInstance: false
  },
  {
    title: 'Diffie-Hellman Key Exchange',
    description: 'Determine the shared secret between Alice and Bob using their public parameters.',
    category: 'Crypto',
    difficulty: 'Hard',
    points: 300,
    author: 'Admin',
    hints: [
      { text: 'Calculate g^(ab) mod p.' }
    ],
    flag: 'SPECTRE{dh_secret_calculated_successfully}',
    isInstance: false
  },
  {
    title: 'Format String Vulnerability',
    description: 'Use the print format string parameters to leak the flag from the program memory stack.',
    category: 'Pwn',
    difficulty: 'Medium',
    points: 200,
    author: 'Meddy',
    hints: [
      { text: 'Try %x or %p strings.' }
    ],
    flag: 'SPECTRE{format_leak_success}',
    isInstance: false
  },
  {
    title: 'Cross-Site Request Forgery (CSRF)',
    description: 'Craft an exploit page that triggers an administrative state change automatically.',
    category: 'Web',
    difficulty: 'Medium',
    points: 150,
    author: 'Admin',
    hints: [
      { text: 'An iframe or form submit works well.' }
    ],
    flag: 'SPECTRE{csrf_attacks_hijack_requests}',
    isInstance: false
  },
  {
    title: 'Server-Side Request Forgery (SSRF)',
    description: 'Trick the web server into fetching files or endpoints from its internal private subnet.',
    category: 'Web',
    difficulty: 'Advanced',
    points: 400,
    author: 'Admin',
    hints: [
      { text: 'Scan localhost ports.' }
    ],
    flag: 'SPECTRE{ssrf_infiltrates_subnets}',
    isInstance: false
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spectre-ctf');
    console.log('Connected to MongoDB');
    
    // Instead of deleting everything, we update existing ones or insert new ones by title.
    // This preserves the _id and thus the user's progress.
    for (const chal of challenges) {
      await Challenge.updateOne(
        { title: chal.title },
        { $set: { status: 'active', ...chal } },
        { upsert: true }
      );
    }
    console.log('Seed challenges synchronized (Upserted as active)');

    // Add a detailed draft challenge
    const draftChallenge = {
      title: 'Draft - Advanced Web Shell Injection',
      description: 'This challenge is a draft testing custom RCE filters. A local shell is running at `http://rce-test.spectre.local:9000`. You must bypass a custom character blacklist (no spaces, no slashes) to read the flag at `/flag.txt`.',
      category: 'Web',
      difficulty: 'Hard',
      points: 300,
      author: 'Admin',
      hints: [
        { text: 'Look into IFS or brace expansion for spaces.' },
        { text: 'Wildcards can help you bypass slashes.' }
      ],
      files: [
        { name: 'rce_src.py', url: '#', size: '4.2 KB', type: 'file' }
      ],
      flag: 'SPECTRE{rce_blacklist_bypass_expert}',
      isInstance: false,
      status: 'draft'
    };

    await Challenge.updateOne(
      { title: draftChallenge.title },
      { $set: draftChallenge },
      { upsert: true }
    );
    console.log('Draft challenge seeded successfully');
    
    mongoose.connection.close();
    console.log('Connection closed');
  } catch (err) {
    console.error(err);
  }
};

seedDB();
