import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LibraryVideo } from '@integration/types';
import { getProjects, moveVideo, type ProjectData } from '@integration/projectApi';
import { useAuth } from '../context/AuthContext';
import { useUserVideos } from '../hooks/useUserVideos';
import { VideoPlayerModal } from './VideoPlayerModal';
import { QualityReportPreview } from './QualityReportPreview';
import styles from './VideoLibrary.module.css';

interface Props {
  videos: LibraryVideo[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onDelete?: (id: string) => Promise<void>;
}

const GENRE_COLORS: Record<string, string> = {
  scary:        '#ef4444',
  trueCrime:    '#f97316',
  conspiracy:   '#a855f7',
  darkHistory:  '#6b7280',
  psychology:   '#3b82f6',
  mythology:    '#eab308',
  stoic:        '#06b6d4',
  mythBusting:  '#10b981',
  survival:     '#84cc16',
  futuristic:   '#8b5cf6',
  biography:    '#f59e0b',
  shockingFacts:'#ec4899',
  business:     '#14b8a6',
  sciExplained: '#22d3ee',
  education:    '#60a5fa',
  history:      '#a16207',
  horror:       '#dc2626',
};

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface CardProps {
  video: LibraryVideo;
  onView: (v: LibraryVideo) => void;
  onDelete?: (id: string) => Promise<void>;
  projects?: ProjectData[];
  showMoveMenu?: boolean;
  onToggleMoveMenu?: (e: React.MouseEvent) => void;
  onMove?: (videoId: string, projectId: string | null) => void;
  onHover?: (rect: DOMRect | null, video: LibraryVideo) => void;
}

function VideoCard({ video, onView, onDelete, projects = [], showMoveMenu, onToggleMoveMenu, onMove, onHover }: CardProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    // Slight delay so quick mouse movements over the grid don't trigger
    hoverTimer.current = setTimeout(() => {
      const r = cardRef.current?.getBoundingClientRect() ?? null;
      onHover?.(r, video);
    }, 350);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    onHover?.(null, video);
  };

  const accentColor = GENRE_COLORS[video.genre] ?? '#6366f1';
  const thumb       = video.thumbnail_url ?? null;
  const overlayText = video.ToverLay ?? null;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete || !confirm('Delete this video?')) return;
    setDeleting(true);
    await onDelete(video.id).catch(() => {});
    setDeleting(false);
  };

  return (
    <div
      ref={cardRef}
      className={styles.card}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Thumbnail */}
      <div className={styles.thumb}>
        {thumb ? (
          <>
            <img src={thumb} alt={video.title} loading="lazy" className={styles.thumbImg} />
            {overlayText && (
              <div className={styles.thumbOverlayText}>{overlayText}</div>
            )}
          </>
        ) : (
          <div className={styles.thumbPlaceholder}>
            <span className={styles.thumbIcon}>🎬</span>
          </div>
        )}

        {/* Genre badge */}
        <span className={styles.badge} style={{ background: accentColor + '22', color: accentColor, borderColor: accentColor + '44' }}>
          {video.genre}
        </span>

        {/* Duration chip */}
        {video.duration > 0 && (
          <span className={styles.duration}>{fmtDuration(video.duration)}</span>
        )}

        {/* Hover overlay */}
        <div className={styles.overlay}>
          <div className={styles.overlayActions}>
            {video.final_video_url && (
              <button
                className={`${styles.overlayBtn} ${styles.overlayBtnPrimary}`}
                onClick={e => { e.stopPropagation(); onView(video); }}
              >
                <span>▶</span> View
              </button>
            )}
            <button
              className={styles.overlayBtn}
              onClick={e => { e.stopPropagation(); navigate(`/studio/${video.id}`); }}
            >
              <span>✏️</span> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <p className={styles.videoTitle}>{video.title || video.topic}</p>
        <div className={styles.meta}>
          <span className={styles.metaDate}>{fmtDate(video.createdAt)}</span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {projects.length > 0 && onToggleMoveMenu && (
              <button
                className={styles.moveBtn}
                onClick={onToggleMoveMenu}
                title="Move to project"
              >📁</button>
            )}
            {onDelete && (
              <button
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleting}
                title="Delete video"
              >
                {deleting ? '…' : '🗑'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Move to project dropdown */}
      {showMoveMenu && onMove && (
        <div className={styles.moveMenu} onClick={e => e.stopPropagation()}>
          <div className={styles.moveMenuHeader}>Move to…</div>
          <div className={styles.moveMenuItem} onClick={() => onMove(video.id, null)}>
            🗂️ Unassigned
          </div>
          <div className={styles.moveMenuSep} />
          {projects.map(p => (
            <div key={p.id} className={styles.moveMenuItem} onClick={() => onMove(video.id, p.id)}>
              📂 {p.title}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function VideoLibrary({ videos, loading, error, onRefresh, onDelete }: Props) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [playingVideo, setPlayingVideo] = useState<LibraryVideo | null>(null);
  const [projects,     setProjects]     = useState<ProjectData[]>([]);
  const [moveMenuId,   setMoveMenuId]   = useState<string | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{ video: LibraryVideo; rect: DOMRect } | null>(null);
  const [tab,          setTab]          = useState<'completed' | 'drafts'>('completed');

  // Lazy-load drafts on demand (only when the user opens the Drafts tab)
  const drafts = useUserVideos('draft');
  const isDraftsTab = tab === 'drafts';
  const displayVideos = isDraftsTab ? drafts.videos : videos;
  const displayLoading = isDraftsTab ? drafts.loading : loading;
  const displayError   = isDraftsTab ? drafts.error   : error;
  const displayRefresh = isDraftsTab ? drafts.refresh : onRefresh;

  useEffect(() => {
    if (!token) return;
    getProjects(token).then(({ projects: ps }) => setProjects(ps)).catch(() => {});
  }, [token]);

  const handleMove = async (videoId: string, projectId: string | null) => {
    if (!token) return;
    try { await moveVideo(videoId, projectId, token); onRefresh(); } catch {}
    setMoveMenuId(null);
  };

  return (
    <div className={styles.wrapper} onClick={() => setMoveMenuId(null)}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.heading}>My Videos</h2>
          {!displayLoading && (
            <span className={styles.count}>
              {displayVideos.length} {isDraftsTab ? 'draft' : 'video'}{displayVideos.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Completed / Drafts toggle */}
          <div className={styles.libTabs}>
            <button
              className={`${styles.libTab} ${tab === 'completed' ? styles.libTabActive : ''}`}
              onClick={() => setTab('completed')}
            >Completed</button>
            <button
              className={`${styles.libTab} ${tab === 'drafts' ? styles.libTabActive : ''}`}
              onClick={() => setTab('drafts')}
            >
              Drafts
              {drafts.videos.length > 0 && (
                <span className={styles.libTabBadge}>{drafts.videos.length}</span>
              )}
            </button>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={displayRefresh}
            disabled={displayLoading}
            title="Refresh"
          >
            <span className={displayLoading ? styles.spinning : ''}>↻</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {displayLoading && displayVideos.length === 0 ? (
        <div className={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : displayError ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p className={styles.emptyText}>{displayError}</p>
          <button className={styles.emptyBtn} onClick={displayRefresh}>Try again</button>
        </div>
      ) : displayVideos.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>{isDraftsTab ? '📝' : '🎬'}</span>
          <p className={styles.emptyTitle}>
            {isDraftsTab ? 'No drafts' : 'No videos yet'}
          </p>
          <p className={styles.emptyText}>
            {isDraftsTab
              ? 'Cancelled / unfinished generations land here so you can pick up where you left off.'
              : 'Generate your first video from the form on the left.'}
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {displayVideos.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              onView={isDraftsTab
                ? () => navigate(`/studio/${v.id}`)        // drafts: jump straight to Edit Studio
                : setPlayingVideo}
              onDelete={isDraftsTab ? drafts.remove : onDelete}
              projects={projects}
              showMoveMenu={moveMenuId === v.id}
              onToggleMoveMenu={e => { e.stopPropagation(); setMoveMenuId(moveMenuId === v.id ? null : v.id); }}
              onMove={handleMove}
              onHover={(rect, video) => setHoverPreview(rect ? { video, rect } : null)}
            />
          ))}
        </div>
      )}

      {/* Video player modal */}
      {playingVideo && playingVideo.final_video_url && (
        <VideoPlayerModal
          videoUrl={playingVideo.final_video_url}
          title={playingVideo.title || playingVideo.topic}
          onClose={() => setPlayingVideo(null)}
        />
      )}

      {/* Floating 3D Quality Report preview (shows on card hover) */}
      {hoverPreview && (
        <QualityReportPreview
          videoId={hoverPreview.video.id}
          token={token ?? undefined}
          anchorRect={hoverPreview.rect}
        />
      )}
    </div>
  );
}
