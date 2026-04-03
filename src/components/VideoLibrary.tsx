import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LibraryVideo } from '@integration/types';
import { VideoPlayerModal } from './VideoPlayerModal';
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
}

function VideoCard({ video, onView, onDelete }: CardProps) {
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

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
    <div className={styles.card}>
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
  );
}

export function VideoLibrary({ videos, loading, error, onRefresh, onDelete }: Props) {
  const [playingVideo, setPlayingVideo] = useState<LibraryVideo | null>(null);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.heading}>My Videos</h2>
          {!loading && (
            <span className={styles.count}>{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        <button className={styles.refreshBtn} onClick={onRefresh} disabled={loading} title="Refresh">
          <span className={loading ? styles.spinning : ''}>↻</span>
        </button>
      </div>

      {/* Content */}
      {loading && videos.length === 0 ? (
        <div className={styles.skeletonGrid}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className={styles.skeleton} style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>⚠️</span>
          <p className={styles.emptyText}>{error}</p>
          <button className={styles.emptyBtn} onClick={onRefresh}>Try again</button>
        </div>
      ) : videos.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🎬</span>
          <p className={styles.emptyTitle}>No videos yet</p>
          <p className={styles.emptyText}>Generate your first video from the form on the left.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {videos.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              onView={setPlayingVideo}
              onDelete={onDelete}
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
    </div>
  );
}
