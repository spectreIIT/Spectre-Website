import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Writeup from './models/Writeup.js';

dotenv.config();

const mockAuthors = [
  { username: 'ShadowX', email: 'shadowx@spectre.local', password: 'Password123!', role: 'Member', isVerified: true },
  { username: 'Nullbyte', email: 'nullbyte@spectre.local', password: 'Password123!', role: 'Member', isVerified: true },
  { username: 'CyberNinja', email: 'cyberninja@spectre.local', password: 'Password123!', role: 'Member', isVerified: true },
  { username: 'MrTeapo', email: 'mrteapo@spectre.local', password: 'Password123!', role: 'Member', isVerified: true },
  { username: 'Vbexhunle', email: 'vbexhunle@spectre.local', password: 'Password123!', role: 'Member', isVerified: true }
];

const writeupsData = [
  {
    title: 'Decompiling Kernelslab: Wieners Attack Path',
    challengeName: 'The Enigma Code',
    difficulty: 'INSANE',
    tags: ['crypto', 'enigma', 'wiener'],
    upvotes: 1850,
    content: 'Full walkthrough of bypassing multi-prime RSA limits using custom Wiener matrix transformations. Step 1: Recover key parameters. Step 2: Formulate matrix. Step 3: Run solvers.'
  },
  {
    title: 'DOM-based XSS payload injection guide',
    challengeName: 'SQLi Advanced',
    difficulty: 'HARD',
    tags: ['web', 'xss', 'dom'],
    upvotes: 1420,
    content: 'Comprehensive analysis of DOM reflection in the result card string formatting templates. By closing the templates and forcing script errors, code execution is achieved.'
  },
  {
    title: 'Easy XOR: Single byte key recovery script',
    challengeName: 'Easy XOR',
    difficulty: 'EASY',
    tags: ['crypto', 'xor'],
    upvotes: 990,
    content: 'A clean python single-liner using list comprehension to brute force all 256 keys of the XOR block. Yields flag in under 2ms.'
  },
  {
    title: 'Bypassing gets() buffer check without canary',
    challengeName: 'Buffer Overflow Basic',
    difficulty: 'MEDIUM',
    tags: ['pwn', 'overflow'],
    upvotes: 420,
    content: 'Stack layout map and exploit payload generation demonstrating how to overwrite the check variable without tripping stack cookies.'
  },
  {
    title: 'Relative path traversal via nested parameters',
    challengeName: 'Directory Traversal',
    difficulty: 'EASY',
    tags: ['web', 'traversal'],
    upvotes: 210,
    content: 'Simple walkthrough on how encoding traversal characters (e.g. %2e%2e%2f) circumvents naive string sanitizers to expose read permissions.'
  },
  {
    title: 'SSRF exploitation inside AWS subnets',
    challengeName: 'Server-Side Request Forgery (SSRF)',
    difficulty: 'INSANE',
    tags: ['web', 'ssrf', 'aws'],
    upvotes: 120,
    content: 'Leveraging server request forwarding to query the internal metadata endpoint (169.254.169.254) and retrieve live access tokens.'
  },
  {
    title: 'Bypassing WAF rules for SQLi payloads',
    challengeName: 'SQLi Basic',
    difficulty: 'MEDIUM',
    tags: ['web', 'sqli', 'waf'],
    upvotes: 820,
    content: 'Tutorial on how using inline comments (/**/) and string concatenation circumvents naive WAF regex matching.'
  },
  {
    title: 'Remote Code Execution via file upload fields',
    challengeName: 'Uploader Bypass',
    difficulty: 'HARD',
    tags: ['web', 'rce', 'upload'],
    upvotes: 950,
    content: 'Demonstrating how double extensions (.php.jpg) and null byte injections trick standard file upload type verification filters.'
  },
  {
    title: 'Cracking custom hashes with Hashcat dictionary rules',
    challengeName: 'Hash Recovery',
    difficulty: 'MEDIUM',
    tags: ['crypto', 'hashcat'],
    upvotes: 560,
    content: 'Building a specialized Hashcat rule list to add numeric suffixes and special characters to wordlists, recovering flags rapidly.'
  },
  {
    title: 'Cookie theft and session hijacking step-by-step',
    challengeName: 'Cookie Stealer',
    difficulty: 'EASY',
    tags: ['web', 'xss', 'session'],
    upvotes: 780,
    content: 'A detailed walkthrough on using reflected XSS to retrieve document.cookie values and inject them into active browser sessions.'
  },
  {
    title: 'Bypassing CORS policies via wildcard subdomains',
    challengeName: 'CORS Misconfiguration',
    difficulty: 'MEDIUM',
    tags: ['web', 'cors'],
    upvotes: 640,
    content: 'Exploiting wildcard subdomain approvals to perform cross-origin data extraction from insecure administrative domains.'
  },
  {
    title: 'Introduction to Assembly: basic stack frame structure',
    challengeName: 'Assembly Basics',
    difficulty: 'EASY',
    tags: ['pwn', 'assembly'],
    upvotes: 410,
    content: 'A starter guide to understanding push, pop, esp, and ebp operations to analyze target stack structures during reverse engineering.'
  },
  {
    title: 'Reversing custom packer layers in binaries',
    challengeName: 'Unpacker',
    difficulty: 'HARD',
    tags: ['reverse', 'packer'],
    upvotes: 320,
    content: 'A comprehensive study on locating the original entry point (OEP) inside packed executable layers to execute clean dumps.'
  },
  {
    title: 'Exploiting blind SQLi via timing delays',
    challengeName: 'SQLi Advanced',
    difficulty: 'HARD',
    tags: ['web', 'sqli', 'timing'],
    upvotes: 750,
    content: 'Using benchmark() and sleep() operations in blind SQL injection vectors to parse individual string characters of data tables sequentially.'
  }
];

// Specific writeups for newfun account
const newfunWriteups = [
  {
    title: 'Advanced SQL Injection bypass on administrative login',
    challengeName: 'SQLi Basic',
    difficulty: 'MEDIUM',
    tags: ['web', 'sqli', 'bypass'],
    upvotes: 1150,
    content: 'Demonstrating how using SQL query comment characters (-- or #) and double URL encoding lets us bypass raw regex sanitization on standard login inputs.'
  },
  {
    title: 'Reversing Substitution Ciphers with Python dictionaries',
    challengeName: 'Easy XOR',
    difficulty: 'EASY',
    tags: ['crypto', 'substitution', 'python'],
    upvotes: 890,
    content: 'A deep-dive tutorial into building key-to-value character dictionaries dynamically. Makes substitution cipher decryption fully automated.'
  },
  {
    title: 'Kernel Panic escalation: custom slab overflow mapping',
    challengeName: 'Kernel Panic',
    difficulty: 'INSANE',
    tags: ['pwn', 'kernel', 'slab'],
    upvotes: 1550,
    content: 'Exhaustive map of standard Slab allocator bounds. By overwriting target slab pointers, privilege escalation is performed locally.'
  }
];

const seedWriteups = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/spectre-ctf');
    console.log('Connected to MongoDB');

    // Deleting any existing writeups first to have a clean, precise seed
    await Writeup.deleteMany({});
    console.log('Cleared existing writeups');

    const createdAuthors = [];

    // Ensure all mock users exist
    for (const aut of mockAuthors) {
      let userObj = await User.findOne({ username: aut.username });
      if (!userObj) {
        userObj = new User(aut);
        await userObj.save();
        console.log(`Created mock user: ${aut.username}`);
      } else {
        console.log(`User ${aut.username} already exists`);
      }
      createdAuthors.push(userObj);
    }

    // Ensure newfun user exists
    let newfunUser = await User.findOne({ username: 'newfun' });
    if (!newfunUser) {
      newfunUser = new User({
        username: 'newfun',
        email: 'newfun@spectre.local',
        password: 'Password123!',
        role: 'Member',
        isVerified: true
      });
      await newfunUser.save();
      console.log('Created mock user: newfun');
    } else {
      console.log('User newfun already exists');
    }

    // Populate standard writeups
    for (let i = 0; i < writeupsData.length; i++) {
      const data = writeupsData[i];
      const author = createdAuthors[i % createdAuthors.length];
      
      const writeupObj = new Writeup({
        ...data,
        author: author._id
      });
      await writeupObj.save();
      console.log(`Seeded writeup: "${data.title}" by ${author.username}`);
    }

    // Populate newfun writeups
    for (const data of newfunWriteups) {
      const writeupObj = new Writeup({
        ...data,
        author: newfunUser._id
      });
      await writeupObj.save();
      console.log(`Seeded writeup: "${data.title}" by newfun`);
    }

    console.log('All mock writeups successfully seeded!');
    mongoose.connection.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Failed to seed writeups:', err);
  }
};

seedWriteups();
