import { useState, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Key, CheckCircle } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import '../../styles/pages/VerifyEmailPage.css';

const VerifyEmailPage = () => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendStatus, setResendStatus] = useState('');
  const [isResending, setIsResending] = useState(false);
  
  const { verifyOtp, resendOtp } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      return setError('Email address is missing. Please sign up again.');
    }
    
    setError('');
    setResendStatus('');
    setIsSubmitting(true);

    try {
      const result = await verifyOtp(email, otp);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Verification failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!email) return setError('Email address is missing. Please sign up again.');
    setError('');
    setResendStatus('');
    setIsResending(true);
    try {
      const result = await resendOtp(email);
      if (result.success) {
        setResendStatus(result.message || 'A new code has been sent.');
      } else {
        setError(result.message || 'Failed to resend code');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsResending(false);
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
          <h1 className="auth-title">VERIFY SIGNAL</h1>
          <p className="auth-subtitle">
            We sent an encrypted code to <br />
            <span className="accent-text">{email || 'your email'}</span>
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {resendStatus && <div className="auth-error" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}>{resendStatus}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Key size={16} className="form-icon" /> OTP CODE
            </label>
            <input
              type="text"
              className="form-input otp-input"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              placeholder="000000"
              maxLength={6}
              autoComplete="one-time-code"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting || !email}>
            {isSubmitting ? 'VERIFYING...' : (
              <>
                <CheckCircle size={18} /> VERIFY IDENTITY
              </>
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          Didn't receive it? <button type="button" className="text-btn" onClick={handleResend} disabled={isResending}>{isResending ? 'Sending...' : 'Resend Code'}</button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
