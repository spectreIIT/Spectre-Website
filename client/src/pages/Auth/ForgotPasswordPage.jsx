import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import '../../styles/pages/LoginPage.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { forgotPassword } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const result = await forgotPassword(email);
      if (result.success) {
        setMessage(result.message || 'Reset link sent to your email.');
        // Navigate back to login page after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(result.message || 'Failed to send reset link');
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
          <h1 className="auth-title">SYSTEM RECOVERY</h1>
          <p className="auth-subtitle">Enter your operator email to request a password recovery link.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-error" style={{ borderColor: '#4CAF50', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)' }}>{message}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Mail size={16} className="form-icon" /> EMAIL ADDRESS
            </label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="agent@spectre.ctf"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'TRANSMITTING...' : (
              <>
                <Send size={18} /> SEND RECOVERY SIGNAL
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
