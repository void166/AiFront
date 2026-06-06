import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  getUnreadCount,
  type AppNotification,
} from '../integration/notificationApi';
import styles from './NotificationBell.module.css';

const POLL_INTERVAL_MS = 30_000; // 30s background unread-count poll

/** Pick an icon + accent colour based on notification type. */
function typeMeta(t: AppNotification['type']): { icon: string; color: string } {
  switch (t) {
    case 'video_completed': return { icon: '🎬', color: '#10b981' };
    case 'video_failed':    return { icon: '⚠️', color: '#ef4444' };
    case 'pdf_processed':   return { icon: '📄', color: '#3b82f6' };
    default:                return { icon: '🔔', color: '#a78bfa' };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)    return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60)    return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)    return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { token, isAuthed } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen]                 = useState(false);
  const [items, setItems]               = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const bellRef     = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Lightweight polling of unread count whenever logged in ───────────────
  const refreshUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const c = await getUnreadCount(token);
      setUnreadCount(c);
    } catch {
      // Silent — bell badge isn't critical to surface errors for.
    }
  }, [token]);

  useEffect(() => {
    if (!isAuthed) {
      setUnreadCount(0);
      setItems([]);
      return;
    }
    refreshUnreadCount();
    const id = window.setInterval(refreshUnreadCount, POLL_INTERVAL_MS);

    // Also refresh whenever the tab regains focus.
    const onFocus = () => refreshUnreadCount();
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthed, refreshUnreadCount]);

  // ── Load full list whenever dropdown opens ───────────────────────────────
  const loadList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listNotifications(token, 30);
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleToggle = () => {
    setOpen(prev => {
      const next = !prev;
      if (next) loadList();
      return next;
    });
  };

  // ── Close on outside-click ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        bellRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // ── Close on Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // ── Row click: mark read + navigate ──────────────────────────────────────
  const handleRowClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead && token) {
      // Optimistic update — keeps the UI responsive even if the request lags.
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
      markNotificationRead(n.id, token).catch(() => {/* ignore */});
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    setUnreadCount(0);
    try { await markAllNotificationsRead(token); } catch {/* ignore */}
  };

  const handleClearAll = async () => {
    if (!token) return;
    setItems([]);
    setUnreadCount(0);
    try { await clearAllNotifications(token); } catch {/* ignore */}
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!token) return;
    setItems(prev => prev.filter(x => x.id !== id));
    try { await deleteNotification(id, token); } catch {/* ignore */}
    refreshUnreadCount();
  };

  if (!isAuthed) return null;

  // ── Dropdown position anchored to bell ───────────────────────────────────
  const rect = bellRef.current?.getBoundingClientRect();
  const dropdownStyle: React.CSSProperties | undefined = rect ? {
    top:  rect.bottom + 8,
    right: window.innerWidth - rect.right,
  } : undefined;

  return (
    <>
      <button
        ref={bellRef}
        className={styles.bellBtn}
        onClick={handleToggle}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div ref={dropdownRef} className={styles.dropdown} style={dropdownStyle}>
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              Notifications
              {unreadCount > 0 && (
                <span className={styles.headerCount}>{unreadCount}</span>
              )}
            </div>
            <div className={styles.headerActions}>
              {unreadCount > 0 && (
                <button className={styles.headerBtn} onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
              {items.length > 0 && (
                <button className={styles.headerBtn} onClick={handleClearAll}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className={styles.list}>
            {loading && (
              <div className={styles.stateRow}>Loading…</div>
            )}
            {!loading && error && (
              <div className={styles.stateRow}>{error}</div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🔔</div>
                <div className={styles.emptyText}>No notifications yet</div>
                <div className={styles.emptySub}>
                  Видео үүсгэхэд эсвэл PDF боловсруулахад энд харагдана.
                </div>
              </div>
            )}

            {!loading && !error && items.map(n => {
              const meta = typeMeta(n.type);
              const thumb = (n.data?.thumbnailUrl as string | undefined) ?? null;
              return (
                <div
                  key={n.id}
                  className={`${styles.row} ${!n.isRead ? styles.rowUnread : ''}`}
                  onClick={() => handleRowClick(n)}
                >
                  {!n.isRead && <span className={styles.unreadDot} />}
                  <div
                    className={styles.iconBox}
                    style={{
                      background: thumb ? undefined : `${meta.color}22`,
                      color: meta.color,
                      backgroundImage: thumb ? `url(${thumb})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {!thumb && meta.icon}
                  </div>
                  <div className={styles.body}>
                    <div className={styles.rowTitle}>{n.title}</div>
                    <div className={styles.rowMessage}>{n.message}</div>
                    <div className={styles.rowTime}>{timeAgo(n.createdAt)}</div>
                  </div>
                  <button
                    className={styles.delBtn}
                    onClick={(e) => handleDelete(e, n.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
