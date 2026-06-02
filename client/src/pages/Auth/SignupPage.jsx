import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, UserPlus } from 'lucide-react';
import AuthContext from '../../context/AuthContext';
import '../../styles/pages/LoginPage.css'; // Reusing the same auth styles

const SignupPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setIsSubmitting(true);

    try {
      const result = await register(username, email, password);
      if (result.success) {
        navigate('/verify-email', { state: { email } });
      } else {
        setError(result.message || 'Failed to register');
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
          <h1 className="auth-title">REGISTER</h1>
          <p className="auth-subtitle">Join the ranks. Create your operator profile.</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} className="form-icon" /> USERNAME
            </label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="operator_name"
              minLength={3}
              autoComplete="off"
            />
          </div>

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
              autoComplete="off"
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
              minLength={6}
              autoComplete="new-password"
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
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? 'INITIALIZING...' : (
              <>
                <UserPlus size={18} /> CREATE PROFILE
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Login here</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
