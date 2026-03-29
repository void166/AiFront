import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@integration/authApi';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export function Login() {
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const res = await login({ email: email.trim(), password });

      console.log("login response =", res);
      console.log("login user =", res.user);
      console.log("login token =", res.user?.token);
      if (res.success && res.user) {
        setAuth(res.user);
        navigate('/');
      } else {
        setError(res.message ?? 'Login failed. Check your credentials.');
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
          <div className={styles.icon}>▶</div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your ReelAI account</p>
        </div>

        {/* Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoFocus
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
            disabled={loading || !email.trim() || !password.trim()}
          >
            {loading ? <span className={styles.spinner} /> : null}
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <button className={styles.link} onClick={() => navigate('/signup')}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
