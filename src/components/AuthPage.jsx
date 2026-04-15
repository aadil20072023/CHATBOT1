import { useState } from 'react';
import { register, login, saveSession, loginWithGoogle, finishGoogleSignup } from '../auth.js';

const COLORS = [
  { id: 'av-green',  label: '🟢', hex: '#25d366' },
  { id: 'av-blue',   label: '🔵', hex: '#4a90d9' },
  { id: 'av-purple', label: '🟣', hex: '#9b59b6' },
  { id: 'av-orange', label: '🟠', hex: '#f39c12' },
  { id: 'av-pink',   label: '🩷', hex: '#e91e8c' },
  { id: 'av-teal',   label: '🩵', hex: '#1abc9c' },
  { id: 'av-red',    label: '🔴', hex: '#e74c3c' },
  { id: 'av-indigo', label: '🔷', hex: '#5c6bc0' },
];

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'google-username'
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '', color: 'av-green' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setError(''); };

  const initials = form.name.trim()
    ? form.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'AB';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      if (!form.name.trim())        return finish('Name is required.');
      if (form.name.trim().length < 2) return finish('Name must be at least 2 characters.');
      if (!form.username.trim())    return finish('Username is required.');
      if (form.username.trim().length < 3) return finish('Username must be at least 3 characters.');
      if (!form.email.includes('@')) return finish('Please enter a valid email.');
      if (form.password.length < 6) return finish('Password must be at least 6 characters.');

      const res = await register({ ...form, initials });
      if (res.error) return finish(res.error);
      saveSession(res.user);
      onAuth(res.user);
    } else {
      if (!form.email || !form.password) return finish('Please fill in all fields.');
      const res = await login({ identifier: form.email, password: form.password });
      if (res.error) return finish(res.error);
      saveSession(res.user);
      onAuth(res.user);
    }
    setLoading(false);
  };

  const finish = (err) => {
    setError(err);
    setLoading(false);
  };

  const tryDemo = async () => {
    setLoading(true);
    const res = await login({ identifier: 'aanya@demo.com', password: 'demo123' });
    if (!res.error) { saveSession(res.user); onAuth(res.user); }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    const res = await loginWithGoogle();
    if (res.error) {
       finish(res.error);
    } else if (res.isNew) {
       setPendingGoogleUser(res.googleUserData);
       setMode('google-username');
       setLoading(false);
    } else {
       saveSession(res.user);
       onAuth(res.user);
       setLoading(false);
    }
  };

  const handleCompleteGoogle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!form.username.trim() || form.username.trim().length < 3) return finish('Username must be at least 3 characters.');
    
    const res = await finishGoogleSignup(pendingGoogleUser, form.username);
    if (res.error) return finish(res.error);
    
    saveSession(res.user);
    onAuth(res.user);
    setLoading(false);
  };

  return (
    <div className="auth-page">
      {/* Background blobs */}
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <div className="auth-blob auth-blob-3" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <div>
            <h1 className="auth-brand">ChatterBox</h1>
            <p className="auth-tagline">Connect. Chat. Vibe.</p>
          </div>
        </div>

        {/* Tabs */}
        {mode !== 'google-username' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => { setMode('register'); setError(''); }}>
              Create Account
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={mode === 'google-username' ? handleCompleteGoogle : handleSubmit} noValidate>

          {mode === 'google-username' && (
             <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, marginBottom: 8 }}>Almost there!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Pick a unique @username to complete your account.</p>
                <div className="auth-field" style={{ marginTop: 24, textAlign: 'left' }}>
                  <label className="auth-label">Username</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">@</span>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder="choose_a_username"
                      value={form.username}
                      onChange={e => set('username', e.target.value)}
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                </div>
             </div>
          )}



          {/* Name – register only */}
          {mode === 'register' && (
            <>
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">👤</span>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="Your full name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    autoFocus
                    maxLength={40}
                    id="register-name"
                  />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Username</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">@</span>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="choose_a_username"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    maxLength={20}
                    id="register-username"
                  />
                </div>
              </div>
            </>
          )}

          {mode !== 'google-username' && (
             <>
                {/* Email / Username */}
                <div className="auth-field">
                  <label className="auth-label">{mode === 'login' ? 'Email or Username' : 'Email address'}</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">✉️</span>
                    <input
                      className="auth-input"
                      type="text"
                      placeholder={mode === 'login' ? 'Enter email or @username' : 'you@example.com'}
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      autoFocus={mode === 'login'}
                      id="login-email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap" style={{ display: 'flex', alignItems: 'center' }}>
                    <span className="auth-input-icon">🔒</span>
                    <input
                      className="auth-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      id="login-password"
                      style={{ flex: 1 }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 10px', fontSize: 16 }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? '👁️' : '🙈'}
                    </button>
                  </div>
                </div>
             </>
          )}


          {/* Error */}
          {error && (
            <div className="auth-error">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" className="auth-submit" id="auth-submit-btn" disabled={loading}>
            {loading
              ? <span className="auth-spinner" />
              : mode === 'login' ? '🚀 Sign In' : mode === 'google-username' ? 'Complete Sign Up' : '✨ Create Account'
            }
          </button>

          {mode !== 'google-username' && (
             <>
               {/* Divider */}
               <div className="auth-divider"><span>or</span></div>

               {/* Google login */}
               <button 
                 type="button" 
                 onClick={handleGoogleAuth} 
                 disabled={loading}
                 style={{ 
                    width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: '#fff', color: '#333', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 15, transition: 'var(--transition)', marginBottom: 12
                 }}
               >
                 <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                 </svg>
                 Continue with Google
               </button>

               {/* Demo login */}
               <button type="button" className="demo-btn" onClick={tryDemo} id="demo-login-btn">
                 ⚡ Try Demo Account
               </button>
             </>
          )}

          {mode === 'login' && (
            <p className="demo-hint">
              Demo: <code>aanya@demo.com</code> / <code>demo123</code>
            </p>
          )}
        </form>

        <p className="auth-footer">
          🔒 All data is stored locally in your browser. No server involved.
        </p>
      </div>
    </div>
  );
}
