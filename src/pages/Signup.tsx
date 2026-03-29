import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '@integration/authApi';
import styles from './Login.module.css'; // reuse identical styles

export function Signup() {
  const navigate = useNavigate();

  const [fullname, setFullname] = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullname.trim() || !email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await signUp({
        fullname: fullname.trim(),
        email: email.trim(),
        password,
      });
      if (res.success) {
        // Redirect to login after successful registration
        navigate('/login');
      } else {
        setError(res.message ?? 'Registration failed. Try again.');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>✦</div>
          <h1 className={styles.title}>Create account</h1>
          <p className={styles.subtitle}>Start generating AI videos today</p>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Full name</label>
            <input
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={fullname}
              onChange={e => setFullname(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.error}>
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className={styles.btn}
            disabled={
              loading ||
              !fullname.trim() ||
              !email.trim() ||
              !password.trim()
            }
          >
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Already have an account?{' '}
          <button className={styles.link} onClick={() => navigate('/login')}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
