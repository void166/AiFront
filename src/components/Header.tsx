import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Header.module.css';

export function Header() {
  const { isAuthed, user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <div className={styles.logo} onClick={() => navigate('/')}>
        <span className={styles.logoIcon}>⚡</span>
        <span className={styles.logoText}>ViralAI</span>
      </div>

      <nav className={styles.nav}>
        <span className={styles.badge}>Beta</span>

        {isAuthed ? (
          <>
            <span className={styles.email}>{user?.email}</span>
            <button
              className={styles.authBtn}
              onClick={() => { logout(); navigate('/login'); }}
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <button className={styles.authBtn} onClick={() => navigate('/login')}>
              Sign In
            </button>
            <button
              className={`${styles.authBtn} ${styles.authBtnAccent}`}
              onClick={() => navigate('/signup')}
            >
              Sign Up
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
