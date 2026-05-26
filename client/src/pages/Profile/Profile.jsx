import React, { useState, useEffect } from 'react';
import { Camera, Key, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import ActivityHeatmap from '../../components/profile/ActivityHeatmap';
import { formatDate } from '../../utils/formatDate';
import { maskEmail } from '../../utils/maskEmail';
import { ROLE_LABELS } from '../../constants/roles';
import '../../styles/pages/profile.css';

function Profile() {
  const { user, forgotPassword } = useAuth();
  
  // ── Profile data ─────────────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch profile
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const data = await authService.getProfile();
        setProfile(data);
        setUsername(data.username || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, [user]);

  // ── Profile update ───────────────────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const payload = {};
      if (username !== profile?.username) payload.username = username;
      if (avatarUrl !== profile?.avatarUrl) payload.avatarUrl = avatarUrl;

      if (Object.keys(payload).length === 0) {
        setLoading(false);
        setIsEditingProfile(false);
        return;
      }

      const { res, data } = await authService.updateProfile(payload);
      if (res.ok) {
        setMessage('Profile updated successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  const roleName = ROLE_LABELS[profile?.role] ?? 'MEMBER';

  const handleRequestPasswordChange = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const result = await forgotPassword(profile.email);
      if (result.success) {
        setMessage('A password change link has been sent to your email.');
      } else {
        setError(result.message || 'Failed to send password change link.');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#00f0ff', gap: '12px' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        Loading profile...
      </div>
    );
  }



  return (
    <div className="profile-container">
      {/* Left Column */}
      <div className="profile-left-col">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar">
            {profile?.avatarUrl && (
              <img 
                src={profile.avatarUrl} 
                alt="Avatar" 
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  if (e.target.nextSibling) {
                    e.target.nextSibling.style.display = 'flex';
                  }
                }}
              />
            )}
            <div 
              className="avatar-fallback" 
              style={{ 
                display: profile?.avatarUrl ? 'none' : 'flex', 
                width: '100%', 
                height: '100%', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '2rem'
              }}
            >
              {profile?.username ? profile.username.charAt(0).toUpperCase() : 'U'}
            </div>
          </div>
          <button className="avatar-edit-btn" onClick={() => setIsEditingProfile(true)}>
            <Camera size={14} />
          </button>
        </div>

        <h2 className="profile-name">{profile?.username || user?.username}</h2>
        <div className="profile-role-badge">{roleName}</div>

        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="profile-stat-val">{profile?.score?.toLocaleString() ?? 0}</div>
            <div className="profile-stat-label">Points</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-val">#{profile?.rank ?? '—'}</div>
            <div className="profile-stat-label">Rank</div>
          </div>
          <div className="profile-stat-box" style={{ marginTop: '16px' }}>
            <div className="profile-stat-val">{profile?.solveCount ?? 0}</div>
            <div className="profile-stat-label">Challenges</div>
          </div>
          <div className="profile-stat-box" style={{ marginTop: '16px' }}>
            <div className="profile-stat-val">{profile?.writeupCount ?? 0}</div>
            <div className="profile-stat-label">Writeups</div>
          </div>
          <div className="profile-stat-box" style={{ marginTop: '16px' }}>
            <div className="profile-stat-val">{profile?.completedModulesCount ?? 0}</div>
            <div className="profile-stat-label">Modules</div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="profile-right-col">
        {message && (
          <div style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </div>
        )}

        {/* Activity Graph */}
        <ActivityHeatmap userId={user._id} score={profile?.score} />

        {/* Account Details */}
        <div className="profile-panel">
          <h3 className="panel-title">
            <span className="panel-title-prefix">&gt;_</span> Account Details
          </h3>

          {isEditingProfile ? (
            <div className="inline-form" style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label className="detail-label">
                  Display Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="detail-label">Avatar URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="form-actions">
                <button className="btn-primary" onClick={handleUpdateProfile} disabled={loading}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
                <button className="btn-secondary" onClick={() => setIsEditingProfile(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="account-details-grid">
              <div className="detail-item">
                <span className="detail-label">Display Name</span>
                <span className="detail-value">{profile?.username || '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Email Address</span>
                <span className="detail-value">{maskEmail(profile?.email)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Role</span>
                <span className="detail-value cyan">{roleName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Member Since</span>
                <span className="detail-value">{formatDate(profile?.createdAt)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Rank</span>
                <span className="detail-value">#{profile?.rank ?? '—'}</span>
              </div>
            </div>
          )}

          {!isEditingProfile && (
            <div style={{ marginTop: '16px' }}>
              <button className="change-pwd-btn" style={{ fontSize: '0.85rem' }} onClick={() => setIsEditingProfile(true)}>
                Edit Profile
              </button>
            </div>
          )}

          <div className="security-section">
            <div className="security-info">
              <h4>Password Management</h4>
              <p>Update your password to keep your account secure.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <button className="change-pwd-btn" onClick={handleRequestPasswordChange} disabled={loading}>
                <Key size={16} /> {loading ? 'Sending...' : 'Change Password'}
              </button>
              {message && message.includes('password') && (
                <span style={{ color: '#10b981', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  ✓ {message}
                </span>
              )}
              {error && (error.includes('password') || error.includes('Server')) && (
                <span style={{ color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
                  {error}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
