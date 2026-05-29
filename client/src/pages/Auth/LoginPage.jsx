import { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Lock, LogIn, CheckSquare, Square, User } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import '../../styles/pages/LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        navigate('/dashboard');
      } else if (result.requiresVerification) {
        navigate('/verify-email', { state: { email } });
      } else {
        setError(result.message || 'Failed to login');
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
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </nav>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">LOGIN</h1>
          <p className="auth-subtitle">Welcome back, Agent. Enter your credentials.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} className="form-icon" /> EMAIL OR USERNAME
            </label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="agent@spectre.ctf or Agent007"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} className="form-icon" /> PASSWORD
            </label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <div style={{ textAlign: 'right', marginTop: '0.2rem' }}>
              <Link to="/forgot-password" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Forgot Password?</Link>
            </div>
          </div>

          {/* Remember Me */}
          <div
            className="remember-me-row"
            onClick={() => setRememberMe(!rememberMe)}
          >
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="remember-me-checkbox"
              style={{ cursor: 'pointer', margin: 0, width: '14px', height: '14px' }}
            />
            <span className="remember-me-label">Remember for a month</span>
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'AUTHENTICATING...' : (
              <>
                <LogIn size={18} /> ENTER ARENA
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" className="auth-link">Sign up here</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

