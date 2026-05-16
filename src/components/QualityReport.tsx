import { useEffect, useState, useCallback } from 'react';
import {
  evaluateVideo, getEvaluation, setUserRating,
  type VideoEvaluation,
} from '../integration/evaluationApi';
import styles from './QualityReport.module.css';

interface Props {
  videoId: string;
  token?: string;
  /** Optional: callback to highlight a weak scene in the parent */
  onSceneHover?: (sceneIndex: number | null) => void;
  /** Notify parent whenever evaluation data changes — used to drive per-scene warnings */
  onEvaluation?: (ev: VideoEvaluation | null) => void;
}

const AXES = [
  { key: 'hook',        label: 'Hook'        },
  { key: 'pacing',      label: 'Pacing'      },
  { key: 'emotion',     label: 'Emotion'     },
  { key: 'clarity',     label: 'Clarity'     },
  { key: 'originality', label: 'Originality' },
] as const;

const SEVERITY_COLOR = {
  info:    '#60A5FA',
  warning: '#FBBF24',
  error:   '#F87171',
};

// Convert scores to SVG points for a regular pentagon radar
function radarPoints(scores: Record<string, number>, cx: number, cy: number, r: number): string {
  return AXES.map((axis, i) => {
    const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    const v     = (scores[axis.key] ?? 0) / 100;
    const x     = cx + Math.cos(angle) * r * v;
    const y     = cy + Math.sin(angle) * r * v;
    return `${x},${y}`;
  }).join(' ');
}

function axisLabelPos(i: number, cx: number, cy: number, r: number) {
  const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  return { x: cx + Math.cos(angle) * (r + 18), y: cy + Math.sin(angle) * (r + 18) };
}

function gradeColor(grade: string | null | undefined): string {
  const g = grade ?? '';
  if (g.startsWith('A')) return '#10B981';
  if (g.startsWith('B')) return '#06B6D4';
  if (g.startsWith('C')) return '#FBBF24';
  if (g.startsWith('D')) return '#F97316';
  return '#EF4444';
}

export function QualityReport({ videoId, token, onSceneHover, onEvaluation }: Props) {
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [running,    setRunning]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [hoverStar,  setHoverStar]  = useState<number | null>(null);

  // Load existing evaluation on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEvaluation(videoId, token)
      .then(data => { if (!cancelled) { setEvaluation(data); onEvaluation?.(data); } })
      .catch(e   => { if (!cancelled) setError(e.message ?? 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, token]);

  const handleRun = useCallback(async () => {
    setRunning(true); setError(null);
    try {
      const result = await evaluateVideo(videoId, token);
      setEvaluation(result);
      onEvaluation?.(result);
    } catch (e: any) {
      setError(e.message ?? 'Evaluation failed');
    } finally {
      setRunning(false);
    }
  }, [videoId, token, onEvaluation]);

  const handleRate = useCallback(async (rating: number) => {
    if (!evaluation) return;
    setEvaluation({ ...evaluation, userRating: rating });
    try {
      await setUserRating(videoId, { rating }, token);
    } catch { /* keep optimistic */ }
  }, [evaluation, videoId, token]);

  const handleLike = useCallback(async (liked: boolean | null) => {
    if (!evaluation) return;
    const next = evaluation.userLiked === liked ? null : liked;
    setEvaluation({ ...evaluation, userLiked: next });
    try {
      await setUserRating(videoId, { liked: next }, token);
    } catch { /* keep optimistic */ }
  }, [evaluation, videoId, token]);

  if (loading) {
    return <div className={styles.card}><div className={styles.loading}>Loading evaluation…</div></div>;
  }

  // Treat malformed payloads (missing overallScore/grade) as "no evaluation yet"
  if (evaluation && (evaluation.overallScore === undefined || !evaluation.scores)) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          <h3 className={styles.title}>Quality Report</h3>
          <p className={styles.emptyText}>Evaluation data is incomplete. Run again.</p>
          <button className={styles.runBtn} onClick={handleRun} disabled={running}>
            {running ? 'Evaluating…' : 'Run AI Evaluation'}
          </button>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className={styles.card}>
        <div className={styles.empty}>
          <h3 className={styles.title}>Quality Report</h3>
          <p className={styles.emptyText}>No AI evaluation yet for this video.</p>
          <button className={styles.runBtn} onClick={handleRun} disabled={running}>
            {running ? 'Evaluating…' : 'Run AI Evaluation'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </div>
    );
  }

  // SVG radar geometry
  const SIZE = 220;
  const CX = SIZE / 2, CY = SIZE / 2;
  const RMAX = 78;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>Quality Report</h3>
        <button className={styles.refreshBtn} onClick={handleRun} disabled={running} title="Re-evaluate">
          {running ? '…' : '↻'}
        </button>
      </div>

      {/* Top: Score circle + Radar */}
      <div className={styles.topRow}>
        <div className={styles.scoreBlock}>
          <div className={styles.gradeBig} style={{ color: gradeColor(evaluation.grade) }}>
            {evaluation.grade}
          </div>
          <div className={styles.overallScore}>{evaluation.overallScore}<span>/100</span></div>
          <div className={styles.overallLabel}>Overall</div>
        </div>

        <div className={styles.radarBlock}>
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.radarSvg}>
            {/* Background pentagon rings */}
            {[0.25, 0.5, 0.75, 1].map(scale => (
              <polygon
                key={scale}
                points={AXES.map((_, i) => {
                  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
                  return `${CX + Math.cos(a) * RMAX * scale},${CY + Math.sin(a) * RMAX * scale}`;
                }).join(' ')}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1"
              />
            ))}
            {/* Axis lines */}
            {AXES.map((_, i) => {
              const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
              return (
                <line key={i}
                  x1={CX} y1={CY}
                  x2={CX + Math.cos(a) * RMAX}
                  y2={CY + Math.sin(a) * RMAX}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Score polygon */}
            <polygon
              points={radarPoints(evaluation.scores as unknown as Record<string, number>, CX, CY, RMAX)}
              fill="url(#radarFill)"
              stroke="#00E5FF"
              strokeWidth="2"
            />
            {/* Score dots */}
            {AXES.map((axis, i) => {
              const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
              const v = (evaluation.scores[axis.key] ?? 0) / 100;
              return (
                <circle key={axis.key}
                  cx={CX + Math.cos(a) * RMAX * v}
                  cy={CY + Math.sin(a) * RMAX * v}
                  r="3" fill="#00E5FF"
                />
              );
            })}
            {/* Labels */}
            {AXES.map((axis, i) => {
              const pos = axisLabelPos(i, CX, CY, RMAX);
              return (
                <text key={axis.key}
                  x={pos.x} y={pos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="10" fill="rgba(255,255,255,0.7)"
                  fontWeight="600"
                >{axis.label}</text>
              );
            })}
            <defs>
              <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.35"/>
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.35"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Score breakdown */}
      <div className={styles.barsBlock}>
        {AXES.map(axis => {
          const value = evaluation.scores[axis.key] ?? 0;
          return (
            <div key={axis.key} className={styles.barRow}>
              <span className={styles.barLabel}>{axis.label}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${value}%` }} />
              </div>
              <span className={styles.barValue}>{value}</span>
            </div>
          );
        })}
      </div>

      {/* AI suggestions */}
      {(evaluation.suggestions?.length ?? 0) > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>AI Suggestions</h4>
          <ul className={styles.suggestions}>
            {evaluation.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Health issues */}
      {(evaluation.healthIssues?.length ?? 0) > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Health Checks</h4>
          <ul className={styles.healthList}>
            {evaluation.healthIssues.map((h, i) => (
              <li key={i} className={styles.healthItem}>
                <span className={styles.severity} style={{ background: SEVERITY_COLOR[h.severity] }} />
                {h.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Per-scene weakness warnings are now rendered directly next to each
          scene in EditStudio — see `weaknessMap` there. */}

      {/* User rating + like/dislike */}
      <div className={styles.ratingSection}>
        <h4 className={styles.sectionTitle}>Your rating</h4>
        <div className={styles.starsRow}>
          {[1, 2, 3, 4, 5].map(n => {
            const filled = (hoverStar ?? evaluation.userRating ?? 0) >= n;
            return (
              <button key={n}
                className={`${styles.starBtn} ${filled ? styles.starFilled : ''}`}
                onMouseEnter={() => setHoverStar(n)}
                onMouseLeave={() => setHoverStar(null)}
                onClick={() => handleRate(n)}
                title={`${n} star${n > 1 ? 's' : ''}`}
              >★</button>
            );
          })}
          <div className={styles.likeRow}>
            <button
              className={`${styles.likeBtn} ${evaluation.userLiked === true  ? styles.liked    : ''}`}
              onClick={() => handleLike(true)}
            >👍</button>
            <button
              className={`${styles.likeBtn} ${evaluation.userLiked === false ? styles.disliked : ''}`}
              onClick={() => handleLike(false)}
            >👎</button>
          </div>
        </div>
      </div>
    </div>
  );
}
