import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

interface PasswordRequirement {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'One special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  const { register, loading } = useAuth();
  const navigate = useNavigate();

  const requirementResults = useMemo(
    () => PASSWORD_REQUIREMENTS.map((req) => req.test(password)),
    [password]
  );

  const passwordValid = requirementResults.every(Boolean);
  const showRequirements = password.length > 0;

  const clearError = () => setError('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password || !confirmPassword || !displayName) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await register(username, email, password, displayName);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="register-container">
      <h2>Create an Account</h2>
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="form-group">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => { setUsername(e.target.value); clearError(); }}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="displayName">Display Name</label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); clearError(); }}
            disabled={loading}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            disabled={loading}
            required
          />
          {showRequirements && (
            <ul className="password-requirements">
              {PASSWORD_REQUIREMENTS.map((req, i) => (
                <li
                  key={req.label}
                  className={`password-requirement ${requirementResults[i] ? 'met' : 'unmet'}`}
                >
                  <span className="requirement-icon" aria-hidden="true">
                    {requirementResults[i] ? '✓' : '○'}
                  </span>
                  {req.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearError(); }}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" disabled={loading || !passwordValid}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
};

export default Register;
