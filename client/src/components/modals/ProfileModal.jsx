import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { X } from 'lucide-react';

function ProfileModal({ isOpen, onClose }) {
  const { user, login } = useContext(AuthContext); // Can use login or a dedicated update function if available, but let's assume we fetch a new token or just update state.
  
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const payload = {};
      if (username !== user.username) payload.username = username;
      if (avatarUrl !== user.avatarUrl) payload.avatarUrl = avatarUrl;
      if (password) payload.password = password;

      if (Object.keys(payload).length === 0) {
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || "http://localhost:5000")}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage('Profile updated successfully! Refresh to see changes globally.');
        setPassword('');
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
      <div style={{ backgroundColor: '#16181f', padding: '24px', borderRadius: '12px', width: '400px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <X size={20} />
        </button>
        <h3 style={{ color: '#fff', marginBottom: '16px' }}>Edit Profile</h3>
        
        {message && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>{message}</div>}
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '8px', borderRadius: '4px', marginBottom: '16px', fontSize: '0.85rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>
              Username (Changes Left: {2 - (user?.nameChangeCount || 0)})
            </label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={(user?.nameChangeCount || 0) >= 2 && username === user?.username}
              style={{ width: '100%', backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>Avatar URL</label>
            <input 
              type="text" 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              style={{ width: '100%', backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '4px', display: 'block' }}>New Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              style={{ width: '100%', backgroundColor: '#12141a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '6px', boxSizing: 'border-box' }}
            />
          </div>
          
          <button type="submit" disabled={loading} style={{ background: '#a855f7', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', marginTop: '8px' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ProfileModal;
