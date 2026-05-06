import { useState, useEffect, useCallback } from 'react';
import {
  adminLogin, getAdminStats, getAdminVideos, getAdminVideoDetail, adminDeleteVideo,
  type AdminVideo, type AdminStats,
} from '@integration/adminApi';
import { VideoPlayerModal } from '../components/VideoPlayerModal';
import styles from './Admin.module.css';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) { return new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: 'short', day: 'numeric' }); }
function fmtDur(s: number | null) {
  if (!s) return '—';
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
}
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

// ── Admin page ────────────────────────────────────────────────────────────────
export function Admin() {
  const [token,   setToken]   = useState(() => sessionStorage.getItem('adminToken') || '');
  const [admin,   setAdmin]   = useState<any>(() => {
    try { return JSON.parse(sessionStorage.getItem('adminInfo') || 'null'); } catch { return null; }
  });

  const logout = () => {
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminInfo');
    setToken('');
    setAdmin(null);
  };

  if (!token) return <AdminLogin onLogin={(t, a) => { sessionStorage.setItem('adminToken', t); sessionStorage.setItem('adminInfo', JSON.stringify(a)); setToken(t); setAdmin(a); }} />;
  return <AdminShell token={token} admin={admin} onLogout={logout} />;
}

// ── Login form ────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string, admin: any) => void }) {
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { token, admin } = await adminLogin(email, pass);
      onLogin(token, admin);
    } catch (err: any) {
      setError(err.message || 'Нэвтрэлт амжилтгүй');
    } finally { setLoading(false); }
  };

  return (
    <div className={styles.page}>
      <div className={styles.loginWrap}>
        <form className={styles.loginCard} onSubmit={handle}>
          <div className={styles.loginTitle}>🔧 Admin Panel</div>
          <div className={styles.loginSub}>Viral AI — Administration</div>
          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Email</label>
            <input className={styles.loginInput} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className={styles.loginField}>
            <label className={styles.loginLabel}>Нууц үг</label>
            <input className={styles.loginInput} type="password" value={pass} onChange={e => setPass(e.target.value)} required />
          </div>
          {error && <div className={styles.loginError}>{error}</div>}
          <button className={styles.loginBtn} type="submit" disabled={loading}>
            {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Admin shell ───────────────────────────────────────────────────────────────
function AdminShell({ token, admin, onLogout }: { token: string; admin: any; onLogout: () => void }) {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [tab,     setTab]     = useState<'videos' | 'users'>('videos');
  const [videos,  setVideos]  = useState<AdminVideo[]>([]);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [selected,setSelected] = useState<string | null>(null);
  const [detail,  setDetail]  = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [playUrl, setPlayUrl] = useState<string | null>(null);

  // Load stats
  useEffect(() => {
    getAdminStats(token).then(setStats).catch(() => {});
  }, [token]);

  // Load videos
  const loadVideos = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const { videos: vs, pagination } = await getAdminVideos(token, 1, 50, q);
      setVideos(vs);
      setTotal(pagination.total);
    } catch {} finally { setLoading(false); }
  }, [token, search]);

  useEffect(() => { if (tab === 'videos') loadVideos(); }, [tab, loadVideos]);

  // Load detail on select
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    getAdminVideoDetail(selected, token).then(setDetail).catch(() => setDetail(null));
  }, [selected, token]);

  const handleDelete = async () => {
    if (!selected || !detail || !confirm('Энэ видеог устгах уу?')) return;
    try {
      await adminDeleteVideo(selected, token);
      setVideos(v => v.filter(x => x.id !== selected));
      setSelected(null);
      setDetail(null);
      setStats(s => s ? { ...s, totalVideos: s.totalVideos - 1 } : s);
    } catch {}
  };

  const badgeClass = (s: string) =>
    s === 'completed' ? styles.bCompleted : s === 'failed' ? styles.bFailed : styles.bProcessing;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>🔧 Admin Panel <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>— {admin?.name}</span></div>
        <button className={styles.logoutBtn} onClick={onLogout}>Гарах</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.stats}>
          {[
            { num: stats.totalUsers,     label: 'Нийт хэрэглэгч', icon: '👤' },
            { num: stats.totalVideos,    label: 'Нийт видео',      icon: '🎬' },
            { num: stats.completedVideos,label: 'Дууссан',         icon: '✅' },
            { num: stats.failedVideos,   label: 'Алдаатай',        icon: '❌' },
          ].map(s => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statNum}>{s.icon} {s.num}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <div className={`${styles.tab} ${tab === 'videos' ? styles.active : ''}`} onClick={() => setTab('videos')}>🎬 Бүх видео ({total})</div>
        <div className={`${styles.tab} ${tab === 'users' ? styles.active : ''}`} onClick={() => setTab('users')}>👤 Хэрэглэгчид</div>
      </div>

      <div className={styles.layout}>
        {/* Table */}
        <div className={styles.tableArea}>
          {tab === 'videos' && (
            <>
              <div className={styles.searchBar}>
                <input
                  className={styles.searchInput}
                  placeholder="Видео хайх..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadVideos(search)}
                />
                <button className={styles.btnPlay} style={{ flex: 'none', padding: '8px 16px' }} onClick={() => loadVideos(search)}>Хайх</button>
              </div>
              {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Уншиж байна...</div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Видео</th>
                      <th>Хэрэглэгч</th>
                      <th>Genre</th>
                      <th>Статус</th>
                      <th>Үргэлжлэл</th>
                      <th>Огноо</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => (
                      <tr key={v.id} className={selected === v.id ? styles.selected : ''} onClick={() => setSelected(v.id)}>
                        <td>
                          <div className={styles.titleCell}>
                            <div className={styles.thumb}>
                              {v.thumbnail_url ? <img src={v.thumbnail_url} alt="" /> : '🎬'}
                            </div>
                            <div>
                              <div className={styles.titleText}>{v.title}</div>
                              <div className={styles.topicText}>{v.topic}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>
                          <div style={{ fontWeight: 500 }}>{v.user?.fullname || '—'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{v.user?.email}</div>
                        </td>
                        <td>{v.genre}</td>
                        <td><span className={`${styles.badge} ${badgeClass(v.status)}`}>{v.status}</span></td>
                        <td>{fmtDur(v.duration)}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(v.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {tab === 'users' && <UsersTab token={token} />}
        </div>

        {/* Detail panel */}
        <div className={styles.detail}>
          {!detail ? (
            <div className={styles.detailEmpty}>
              <span className={styles.detailEmptyIcon}>👆</span>
              <span style={{ fontSize: 14 }}>Видео сонгоно уу</span>
            </div>
          ) : (
            <>
              <div className={styles.detailVideo}>
                {detail.video.final_video_url
                  ? <img className={styles.detailThumb} src={detail.video.thumbnail_url || detail.video.final_video_url} alt="" />
                  : <div className={styles.noVideo}>🎬</div>}
              </div>

              <div className={styles.detailBody}>
                <div className={styles.detailTitle}>{detail.video.title}</div>

                {/* User */}
                {detail.user && (
                  <div className={styles.section}>
                    <div className={styles.sectionLabel}>Хэрэглэгч</div>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>{initials(detail.user.fullname || 'U')}</div>
                      <div>
                        <div className={styles.userName}>{detail.user.fullname}</div>
                        <div className={styles.userEmail}>{detail.user.email}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Video info */}
                <div className={styles.section}>
                  <div className={styles.sectionLabel}>Видео мэдээлэл</div>
                  {[
                    ['Genre',      detail.video.genre],
                    ['Language',   detail.video.language],
                    ['Image Style',detail.video.imageStyle],
                    ['Duration',   fmtDur(detail.video.duration)],
                    ['BGM',        detail.video.bgmPath || '—'],
                    ['Status',     detail.video.status],
                    ['Scenes',     detail.scenes?.length || 0],
                    ['Created',    fmtDate(detail.video.createdAt)],
                  ].map(([k, v]) => (
                    <div key={k as string} className={styles.infoRow}>
                      <span className={styles.infoKey}>{k}</span>
                      <span className={styles.infoVal}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.detailActions}>
                <button className={styles.btnDel} onClick={handleDelete}>🗑 Устгах</button>
                {detail.video.final_video_url && (
                  <button className={styles.btnPlay} onClick={() => setPlayUrl(detail.video.final_video_url)}>▶ Тоглуулах</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {playUrl && (
        <VideoPlayerModal videoUrl={playUrl} title={detail?.video?.title || 'Video'} onClose={() => setPlayUrl(null)} />
      )}
    </div>
  );
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('@integration/adminApi').then(({ getAdminUsers }) => {
      getAdminUsers(token).then(({ users: us }) => setUsers(us)).finally(() => setLoading(false));
    });
  }, [token]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>⏳ Уншиж байна...</div>;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Хэрэглэгч</th>
          <th>Email</th>
          <th>Видео</th>
          <th>Бүртгэсэн</th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className={styles.userAvatar} style={{ width: 28, height: 28, fontSize: 12 }}>{initials(u.fullname || 'U')}</div>
                <span style={{ fontWeight: 500 }}>{u.fullname}</span>
              </div>
            </td>
            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
            <td><span className={`${styles.badge} ${styles.bCompleted}`}>{u.videoCount}</span></td>
            <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(u.createdAt)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
