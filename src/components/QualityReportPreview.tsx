import { useEffect, useState, useRef } from 'react';
import { getEvaluation, type VideoEvaluation } from '../integration/evaluationApi';
import styles from './QualityReportPreview.module.css';

interface Props {
  videoId: string;
  token?: string;
  /** Position of the parent card so we can place the preview next to it */
  anchorRect: DOMRect | null;
}

const AXES = [
  { key: 'hook',        label: 'HK' },
  { key: 'pacing',      label: 'PC' },
  { key: 'emotion',     label: 'EM' },
  { key: 'clarity',     label: 'CL' },
  { key: 'originality', label: 'OR' },
] as const;

function gradeColor(grade: string | null | undefined): string {
  const g = grade ?? '';
  if (g.startsWith('A')) return '#10B981';
  if (g.startsWith('B')) return '#06B6D4';
  if (g.startsWith('C')) return '#FBBF24';
  if (g.startsWith('D')) return '#F97316';
  return '#EF4444';
}

// In-memory cache so re-hovering the same card doesn't re-fetch
const cache = new Map<string, VideoEvaluation | null>();

export function QualityReportPreview({ videoId, token, anchorRect }: Props) {
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null | undefined>(
    cache.has(videoId) ? cache.get(videoId) : undefined,
  );
  const [tilt, setTilt] = useState({ rx: 8, ry: -10 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cache.has(videoId)) return;
    let cancelled = false;
    getEvaluation(videoId, token)
      .then(data => {
        if (cancelled) return;
        cache.set(videoId, data);
        setEvaluation(data);
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(videoId, null);
        setEvaluation(null);
      });
    return () => { cancelled = true; };
  }, [videoId, token]);

  // Mouse-tracked 3D tilt
  const handleMouseMove = (e: React.MouseEvent) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width)  - 0.5;
    const y = ((e.clientY - r.top)  / r.height) - 0.5;
    setTilt({ rx: -y * 14, ry: x * 16 });
  };

  // Position the preview next to the anchor.
  // Heuristic: cards in the RIGHT half of the viewport open the preview to
  // the LEFT so we never push past the viewport edge (which would trigger
  // horizontal scroll). Cards in the left half open it to the right.
  const posStyle: React.CSSProperties = (() => {
    if (!anchorRect) return { display: 'none' };
    const PREVIEW_W = 280;
    const PREVIEW_H = 360;
    const GAP = 16;
    const SAFE = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const spaceRight = viewportW - anchorRect.right;
    const spaceLeft  = anchorRect.left;
    const cardCenter = anchorRect.left + anchorRect.width / 2;
    const preferLeft = cardCenter > viewportW / 2;     // right-half cards prefer left

    let left: number;
    if (preferLeft) {
      // Try left first; fall back to right; else clamp
      if (spaceLeft >= PREVIEW_W + GAP + SAFE) {
        left = anchorRect.left - PREVIEW_W - GAP;
      } else if (spaceRight >= PREVIEW_W + GAP + SAFE) {
        left = anchorRect.right + GAP;
      } else {
        left = anchorRect.left + anchorRect.width / 2 - PREVIEW_W / 2;
      }
    } else {
      // Left-half cards: prefer right side
      if (spaceRight >= PREVIEW_W + GAP + SAFE) {
        left = anchorRect.right + GAP;
      } else if (spaceLeft >= PREVIEW_W + GAP + SAFE) {
        left = anchorRect.left - PREVIEW_W - GAP;
      } else {
        left = anchorRect.left + anchorRect.width / 2 - PREVIEW_W / 2;
      }
    }
    // Hard clamp — preview never extends past viewport edges
    left = Math.max(SAFE, Math.min(viewportW - PREVIEW_W - SAFE, left));

    let top = anchorRect.top + anchorRect.height / 2 - PREVIEW_H / 2;
    top = Math.max(SAFE, Math.min(viewportH - PREVIEW_H - SAFE, top));

    return { left, top };
  })();

  // SVG radar geometry
  const SIZE = 140;
  const CX = SIZE / 2, CY = SIZE / 2;
  const RMAX = 50;

  // Common tilt transform — applied to the INNER card so the outer wrapper
  // can run its own smooth float animation independently.
  const tiltTransform = `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`;

  // Loading shimmer
  if (evaluation === undefined) {
    return (
      <div className={styles.floatWrap} style={posStyle}>
        <div
          ref={cardRef}
          className={styles.preview}
          style={{ transform: tiltTransform }}
          onMouseMove={handleMouseMove}
        >
          <div className={styles.loading}>
            <div className={styles.skeleton} />
            <span>Loading…</span>
          </div>
        </div>
      </div>
    );
  }

  // No evaluation yet
  if (!evaluation) {
    return (
      <div className={styles.floatWrap} style={posStyle}>
        <div
          ref={cardRef}
          className={`${styles.preview} ${styles.noData}`}
          style={{ transform: tiltTransform }}
          onMouseMove={handleMouseMove}
        >
          <div className={styles.noDataInner}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 3v18M3 12h18" strokeLinecap="round"/>
            </svg>
            <p className={styles.noDataTitle}>Not evaluated yet</p>
            <p className={styles.noDataHint}>Open Edit Studio to run AI Quality analysis</p>
          </div>
        </div>
      </div>
    );
  }

  const radarPoints = AXES.map((axis, i) => {
    const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    const v = ((evaluation.scores as any)?.[axis.key] ?? 0) / 100;
    return `${CX + Math.cos(a) * RMAX * v},${CY + Math.sin(a) * RMAX * v}`;
  }).join(' ');

  const color = gradeColor(evaluation.grade);

  return (
    <div className={styles.floatWrap} style={posStyle}>
      <div
        ref={cardRef}
        className={styles.preview}
        style={{
          transform: tiltTransform,
          ['--grade-color' as any]: color,
        }}
        onMouseMove={handleMouseMove}
      >
      {/* Floating accent dots — depth illusion */}
      <span className={styles.dot1} />
      <span className={styles.dot2} />

      {/* Header */}
      <div className={styles.head}>
        <span className={styles.label}>Quality Report</span>
        <span className={styles.tagPro}>AI</span>
      </div>

      {/* Big grade + radar */}
      <div className={styles.main}>
        <div className={styles.gradeBlock}>
          <div className={styles.grade} style={{ color }}>{evaluation.grade}</div>
          <div className={styles.score}>{evaluation.overallScore}<span>/100</span></div>
        </div>

        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.radar}>
          {/* Rings */}
          {[0.25, 0.5, 0.75, 1].map(scale => (
            <polygon
              key={scale}
              points={AXES.map((_, i) => {
                const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
                return `${CX + Math.cos(a) * RMAX * scale},${CY + Math.sin(a) * RMAX * scale}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="0.8"
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
                stroke="rgba(255,255,255,0.05)" strokeWidth="0.8"
              />
            );
          })}
          {/* Score polygon */}
          <polygon points={radarPoints} fill="url(#previewFill)" stroke={color} strokeWidth="1.5"/>
          {/* Dots + labels */}
          {AXES.map((axis, i) => {
            const a = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
            const v = ((evaluation.scores as any)?.[axis.key] ?? 0) / 100;
            return (
              <g key={axis.key}>
                <circle cx={CX + Math.cos(a) * RMAX * v} cy={CY + Math.sin(a) * RMAX * v} r="1.8" fill={color}/>
                <text
                  x={CX + Math.cos(a) * (RMAX + 9)}
                  y={CY + Math.sin(a) * (RMAX + 9)}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="7" fontWeight="700"
                  fill="rgba(255,255,255,0.55)"
                >{axis.label}</text>
              </g>
            );
          })}
          <defs>
            <linearGradient id="previewFill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={color} stopOpacity="0.4"/>
              <stop offset="100%" stopColor={color} stopOpacity="0.1"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Score bars (5 mini bars) */}
      <div className={styles.bars}>
        {AXES.map(axis => {
          const v = (evaluation.scores as any)?.[axis.key] ?? 0;
          return (
            <div key={axis.key} className={styles.barRow}>
              <span className={styles.barLabel}>{axis.label}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${v}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }} />
              </div>
              <span className={styles.barVal}>{v}</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className={styles.foot}>
        {evaluation.healthIssues && evaluation.healthIssues.length > 0
          ? <span className={styles.footWarn}>
              <span className={styles.warnDot} />
              {evaluation.healthIssues.length} issue{evaluation.healthIssues.length > 1 ? 's' : ''} found
            </span>
          : <span className={styles.footOk}>All checks passed</span>}
      </div>
      </div>
    </div>
  );
}
