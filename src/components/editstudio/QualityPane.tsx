import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  evaluateVideo, getEvaluation, setUserRating,
  type VideoEvaluation,
} from '../../integration/evaluationApi';
import styles from './QualityPane.module.css';

const AXES = [
  { key: 'hook',        label: 'Hook'        },
  { key: 'pacing',      label: 'Pacing'      },
  { key: 'emotion',     label: 'Emotion'     },
  { key: 'clarity',     label: 'Clarity'     },
  { key: 'originality', label: 'Originality' },
] as const;

interface Props {
  videoId:       string;
  token?:        string;
  onEvaluation?: (e: VideoEvaluation | null) => void;
  onSceneHover?: (idx: number | null) => void;
  refreshTick?:  number;
  /** When parent clicks a weak scene chip, navigate to it. */
  onJumpToScene?: (idx: number) => void;
}

function vertex(i: number, r: number, cx = 100, cy = 100) {
  const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
}

export function QualityPane({
  videoId, token, onEvaluation, onSceneHover, refreshTick, onJumpToScene,
}: Props) {
  const [evalData,  setEvalData]  = useState<VideoEvaluation | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [running,   setRunning]   = useState(false);
  const [hoverStar, setHoverStar] = useState<number | null>(null);

  /* Collapsible sub-sections — closed by default to reduce visual noise */
  const [openBars,   setOpenBars]   = useState(false);
  const [openSugg,   setOpenSugg]   = useState(false);
  const [openWeak,   setOpenWeak]   = useState(true);   // most actionable, keep open
  const [openHealth, setOpenHealth] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getEvaluation(videoId, token)
      .then(d => { if (!cancelled) { setEvalData(d); onEvaluation?.(d); } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, token, refreshTick]);

  const handleEvaluate = useCallback(async () => {
    setRunning(true);
    try {
      const r = await evaluateVideo(videoId, token);
      setEvalData(r); onEvaluation?.(r);
    } catch (e) { console.error(e); }
    finally { setRunning(false); }
  }, [videoId, token, onEvaluation]);

  const handleRate = useCallback(async (n: number) => {
    if (!evalData) return;
    setEvalData({ ...evalData, userRating: n });
    try { await setUserRating(videoId, { rating: n }, token); } catch {}
  }, [evalData, videoId, token]);

  const handleLike = useCallback(async (liked: boolean | null) => {
    if (!evalData) return;
    const next = evalData.userLiked === liked ? null : liked;
    setEvalData({ ...evalData, userLiked: next });
    try { await setUserRating(videoId, { liked: next }, token); } catch {}
  }, [evalData, videoId, token]);

  if (loading) {
    return <aside className={styles.pane}><div className={styles.loading}>Loading…</div></aside>;
  }

  if (!evalData) {
    return (
      <aside className={styles.pane}>
        <div className={styles.head}>
          <span className={styles.headLabel}>QUALITY</span>
        </div>
        <div className={styles.empty}>
          <p>No AI evaluation yet.</p>
          <button className={styles.evalBtn} onClick={handleEvaluate} disabled={running}>
            {running ? 'Evaluating…' : 'Run AI Evaluation'}
          </button>
        </div>
      </aside>
    );
  }

  const radarMax = 80;
  const dataPts = AXES.map((axis, i) => {
    const v = ((evalData.scores as any)[axis.key] ?? 0) / 100;
    return vertex(i, radarMax * v);
  });
  const dataPath = dataPts.map(p => p.join(',')).join(' ');

  return (
    <aside className={styles.pane}>
      {/* Compact head: title + refresh */}
      <div className={styles.head}>
        <span className={styles.headLabel}>QUALITY</span>
        <button className={styles.refreshBtn} onClick={handleEvaluate} disabled={running} title="Re-evaluate">
          {running ? '…' : '↻'}
        </button>
      </div>

      {/* Grade + Overall — always visible */}
      <div className={styles.gradeRow}>
        <GradeLetter grade={evalData.grade}/>
        <div className={styles.scoreBlock}>
          <div className={styles.scoreNum}>
            {evalData.overallScore}<small>/100</small>
          </div>
          <span className={styles.scoreLabel}>OVERALL</span>
        </div>
      </div>

      {/* Radar — always visible (the visual centerpiece) */}
      <div className={styles.radarBox}>
        <svg viewBox="0 0 200 200" className={styles.radar}>
          <defs>
            <linearGradient id="qpFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.5"/>
            </linearGradient>
            <linearGradient id="qpStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00e5ff"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
            <polygon key={i}
              points={AXES.map((_, k) => vertex(k, 80 * scale).join(',')).join(' ')}
              fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1"/>
          ))}
          {AXES.map((_, i) => {
            const [x, y] = vertex(i, 80);
            return <line key={i} x1="100" y1="100" x2={x} y2={y}
                         stroke="rgba(148,163,184,0.12)" strokeWidth="1"/>;
          })}

          <motion.polygon
            initial={false}
            animate={{ points: dataPath }}
            transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
            fill="url(#qpFill)" stroke="url(#qpStroke)" strokeWidth="2"/>

          {dataPts.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.8" fill="#fff" stroke="url(#qpStroke)" strokeWidth="1.4"/>
          ))}

          {AXES.map((axis, i) => {
            const [x, y] = vertex(i, 94);
            const val = (evalData.scores as any)[axis.key] ?? 0;
            return (
              <g key={axis.key}>
                <text x={x} y={y - 2} textAnchor="middle"
                      fontSize="8" fontWeight="600" fill="rgba(231,236,245,0.75)">
                  {axis.label}
                </text>
                <text x={x} y={y + 8} textAnchor="middle"
                      fontSize="10" fontWeight="800" fill="#fff">
                  {val}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Collapsible: weak scenes (most useful, default open) ── */}
      {evalData.sceneScores?.some(s => s.weakness) && (
        <Collapsible title="WEAK SCENES" count={evalData.sceneScores.filter(s => s.weakness).length}
                     open={openWeak} onToggle={() => setOpenWeak(o => !o)}>
          <ul className={styles.weakList}>
            {evalData.sceneScores.filter(s => s.weakness).map(s => (
              <li key={s.sceneIndex} className={styles.weakItem}
                  onClick={() => onJumpToScene?.(s.sceneIndex)}
                  onMouseEnter={() => onSceneHover?.(s.sceneIndex)}
                  onMouseLeave={() => onSceneHover?.(null)}>
                <span className={styles.weakIdx}>{s.sceneIndex + 1}</span>
                <span className={styles.weakText}>{s.weakness}</span>
                <span className={styles.weakScore}>{s.score}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* ── Collapsible: breakdown bars ── */}
      <Collapsible title="BREAKDOWN" open={openBars} onToggle={() => setOpenBars(o => !o)}>
        <div className={styles.bars}>
          {AXES.map(axis => {
            const v = (evalData.scores as any)[axis.key] ?? 0;
            return (
              <div key={axis.key} className={styles.barRow}>
                <span className={styles.barLabel}>{axis.label}</span>
                <span className={styles.barVal}>{v}</span>
                <div className={styles.barTrack}>
                  <motion.div className={styles.barFill}
                    initial={{ width: 0 }} animate={{ width: `${v}%` }}
                    transition={{ duration: 0.55, ease: 'easeOut' }}/>
                </div>
              </div>
            );
          })}
        </div>
      </Collapsible>

      {/* ── Collapsible: AI suggestions ── */}
      {evalData.suggestions?.length > 0 && (
        <Collapsible title="SUGGESTIONS" count={evalData.suggestions.length}
                     open={openSugg} onToggle={() => setOpenSugg(o => !o)}>
          <ul className={styles.sugList}>
            {evalData.suggestions.map((s, i) => (
              <li key={i} className={styles.sugItem}>
                <span className={styles.sugIdx}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* ── Collapsible: health checks ── */}
      {evalData.healthIssues?.length > 0 && (
        <Collapsible title="HEALTH" count={evalData.healthIssues.length}
                     open={openHealth} onToggle={() => setOpenHealth(o => !o)}>
          <ul className={styles.healthList}>
            {evalData.healthIssues.map((h, i) => (
              <li key={i} className={styles.healthItem}>
                <span className={`${styles.sev} ${styles[`sev_${h.severity}`]}`}/>
                {h.message}
              </li>
            ))}
          </ul>
        </Collapsible>
      )}

      {/* ── User rating (compact) ── */}
      <div className={styles.ratingBox}>
        <div className={styles.stars}>
          {[1,2,3,4,5].map(n => {
            const filled = (hoverStar ?? evalData.userRating ?? 0) >= n;
            return (
              <button key={n}
                className={`${styles.star} ${filled ? styles.starFilled : ''}`}
                onMouseEnter={() => setHoverStar(n)}
                onMouseLeave={() => setHoverStar(null)}
                onClick={() => handleRate(n)}>★</button>
            );
          })}
          <span className={styles.likeRow}>
            <button className={`${styles.like} ${evalData.userLiked === true ? styles.liked : ''}`}
                    onClick={() => handleLike(true)} title="Like">↑</button>
            <button className={`${styles.like} ${evalData.userLiked === false ? styles.disliked : ''}`}
                    onClick={() => handleLike(false)} title="Dislike">↓</button>
          </span>
        </div>
      </div>
    </aside>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function Collapsible({ title, count, open, onToggle, children }: {
  title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className={styles.collapse}>
      <button className={styles.collapseHead} onClick={onToggle}>
        <span className={styles.collapseTitle}>{title}</span>
        {count != null && <span className={styles.collapseBadge}>{count}</span>}
        <span className={styles.collapseChev} style={{ transform: open ? 'rotate(180deg)' : '' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      {open && <div className={styles.collapseBody}>{children}</div>}
    </section>
  );
}

function GradeLetter({ grade }: { grade: string }) {
  const g = (grade ?? 'C').trim();
  const { from, to, shadow } = gradeColors(g);
  return (
    <div className={styles.gradeWrap}
         style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: shadow }}>
      <span className={styles.gradeLetter}>{g}</span>
    </div>
  );
}
function gradeColors(g: string) {
  if (g.startsWith('A')) return { from: '#34d399', to: '#059669', shadow: '0 6px 22px rgba(16,185,129,.4)' };
  if (g.startsWith('B')) return { from: '#67e8f9', to: '#06b6d4', shadow: '0 6px 22px rgba(6,182,212,.4)' };
  if (g.startsWith('C')) return { from: '#fcd34d', to: '#f59e0b', shadow: '0 6px 22px rgba(245,158,11,.4)' };
  if (g.startsWith('D')) return { from: '#fca5a5', to: '#ef4444', shadow: '0 6px 22px rgba(239,68,68,.4)' };
  return                        { from: '#fca5a5', to: '#b91c1c', shadow: '0 6px 22px rgba(185,28,28,.4)' };
}
