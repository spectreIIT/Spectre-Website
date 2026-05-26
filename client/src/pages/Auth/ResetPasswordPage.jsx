import { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Key, Lock, CheckCircle } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import '../../styles/pages/LoginPage.css';
import '../../styles/pages/VerifyEmailPage.css'; // For otp-input styling

const ResetPasswordPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { resetPassword, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || location.state?.email || '';
  const token = searchParams.get('token') || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token) {
      return setError('Missing reset token or email. Request a new password reset link.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    setError('');
    setIsSubmitting(true);

    try {
      const result = await resetPassword(email, token, newPassword);
      if (result.success) {
        logout(); // Force logout so the user must log in again with the new password
        setMessage('Password reset successfully!');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.message || 'Failed to reset password');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <nav className="auth-nav">
        <Link to="/login" className="back-link">
          <ArrowLeft size={16} /> Back to Login
        </Link>
      </nav>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">NEW PASSWORD</h1>
          <p className="auth-subtitle">Set a new password for your account.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-error" style={{ borderColor: '#4CAF50', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)' }}>{message}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} className="form-icon" /> NEW PASSWORD
            </label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} className="form-icon" /> CONFIRM PASSWORD
            </label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting || !email}>
            {isSubmitting ? 'UPDATING...' : (
              <>
                <CheckCircle size={18} /> CONFIRM OVERRIDE
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
