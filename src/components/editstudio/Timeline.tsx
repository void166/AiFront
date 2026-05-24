import { useEffect, useMemo, useRef, useState } from 'react';
import type { SceneVM } from './types';
import styles from './Timeline.module.css';

const PALETTE: [string, string][] = [
  ['#22d3ee', '#0891b2'],
  ['#a78bfa', '#6d28d9'],
  ['#fdba74', '#c2410c'],
  ['#5eead4', '#0d9488'],
  ['#fde047', '#ca8a04'],
  ['#f9a8d4', '#be185d'],
];

interface Props {
  scenes:    SceneVM[];
  cursor:    number;
  total:     number;
  activeId:  number;
  hoveredId: number | null;
  playing:   boolean;
  /** Pre-computed cumulative scene-start offsets from EditStudio.
   *  Optional: when omitted, falls back to deriving from durationSec
   *  (kept for backward compatibility). Passing this guarantees the
   *  timeline cursor, ruler, and scene blocks agree with the seek logic
   *  in PreviewStage and the playback loop in EditStudio.                 */
  sceneStarts?: number[];
  onSeek:    (sec: number) => void;
  onPlay:    () => void;
  onPause:   () => void;
  onSelect:  (idx: number) => void;
  onHover:   (idx: number | null) => void;
}

function fmt(n: number) {
  if (!isFinite(n) || n < 0) n = 0;
  const m = Math.floor(n / 60);
  const s = (n % 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

export function Timeline({
  scenes, cursor, total, activeId, hoveredId, playing,
  sceneStarts: sceneStartsProp,
  onSeek, onPlay, onPause, onSelect, onHover,
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);

  /* Prefer EditStudio-supplied cumulative offsets; fall back to deriving
     from scene durations when no prop is given.                            */
  const sceneStarts = useMemo(() => {
    if (sceneStartsProp && sceneStartsProp.length === scenes.length) {
      return sceneStartsProp;
    }
    const out: number[] = [];
    let acc = 0;
    for (const s of scenes) { out.push(acc); acc += s.durationSec; }
    return out;
  }, [scenes, sceneStartsProp]);

  const sceneAt = (sec: number) => {
    for (let i = scenes.length - 1; i >= 0; i--) {
      if (sec >= sceneStarts[i]) return i;
    }
    return 0;
  };

  const seekFromPointer = (clientX: number) => {
    const el = trackRef.current; if (!el || total <= 0) return;
    const r = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const sec = pct * total;
    onSeek(sec);
    onSelect(sceneAt(sec));
  };

  /* Window-level drag handlers so dragging works even off-track */
  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: MouseEvent) => seekFromPointer(e.clientX);
    const onUp   = () => setScrubbing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubbing, total, scenes.length]);

  /* Ruler ticks (major every N sec, minor between) */
  const tickStep = total > 60 ? 10 : total > 30 ? 5 : total > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= total + 0.001; t += tickStep) ticks.push(Math.round(t));

  const cursorPct = total > 0 ? (cursor / total) * 100 : 0;

  return (
    <div className={styles.timeline}>
      {/* Toolbar */}
      <div className={styles.tools}>
        <button className={styles.playBtn} onClick={playing ? onPause : onPlay}>
          {playing
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
        </button>
        <button className={styles.miniBtn} title="-1s" onClick={() => onSeek(Math.max(0, cursor - 1))}>−1s</button>
        <button className={styles.miniBtn} title="+1s" onClick={() => onSeek(Math.min(total, cursor + 1))}>+1s</button>
        <span className={styles.time}>
          <b>{fmt(cursor)}</b><span className={styles.dim}>/ {fmt(total)}</span>
        </span>
        <div className={styles.spacer}/>
        <span className={styles.activeChip}>
          SCENE {String(activeId + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Ruler */}
      <div className={styles.ruler}>
        {ticks.map(t => (
          <span key={t} className={styles.tick} style={{ left: `${(t / total) * 100}%` }}>
            {t}s
          </span>
        ))}
      </div>

      {/* Scene track — clickable, draggable */}
      <div className={styles.trackOuter}>
        <div className={styles.track}
             ref={trackRef}
             onMouseDown={(e) => { setScrubbing(true); seekFromPointer(e.clientX); }}>
          {scenes.map(s => {
            const [from, to] = PALETTE[s.index % PALETTE.length];
            const flexBasis = `${(s.durationSec / Math.max(0.01, total)) * 100}%`;
            const isActive = s.index === activeId;
            const isHover = s.index === hoveredId;
            const hasWarn = Boolean(s.weakness);
            return (
              <div key={s.index}
                   className={`${styles.block} ${isActive ? styles.blockActive : ''} ${isHover ? styles.blockHover : ''}`}
                   style={{ flexBasis, background: `linear-gradient(135deg, ${from}, ${to})` }}
                   onClick={(e) => {
                     e.stopPropagation();
                     onSeek(sceneStarts[s.index]);
                     onSelect(s.index);
                   }}
                   onMouseEnter={() => onHover(s.index)}
                   onMouseLeave={() => onHover(null)}
                   title={`${s.role} · starts ${fmt(sceneStarts[s.index])} · ${s.durationSec.toFixed(1)}s`}>
                <span className={styles.blockStart}>{fmt(sceneStarts[s.index])}</span>
                <span className={styles.blockLabel}>
                  {String(s.index + 1).padStart(2, '0')} · {s.role}
                </span>
                {hasWarn && <span className={styles.warnBadge}>!</span>}
              </div>
            );
          })}

          {/* Scene boundary tick marks ABOVE the track */}
          {scenes.map(s => {
            const startPct = (sceneStarts[s.index] / Math.max(0.01, total)) * 100;
            return s.index === 0 ? null : (
              <div key={`b${s.index}`} className={styles.boundary}
                   style={{ left: `${startPct}%` }} />
            );
          })}

          {/* Playhead */}
          <div className={styles.cursor} style={{ left: `${cursorPct}%` }}>
            <div className={styles.cursorHead}/>
            <div className={styles.cursorLine}/>
          </div>
        </div>
      </div>
    </div>
  );
}
