import { useState } from 'react';
import type { SceneVM } from './types';
import { SceneThumb } from './SceneThumb';
import styles from './SceneSidebar.module.css';

interface Props {
  scenes:     SceneVM[];
  activeId:   number;
  hoveredId:  number | null;
  onSelect:   (idx: number) => void;
  onHover:    (idx: number | null) => void;
  onAdd:      () => void;
  onRemove:   (idx: number) => void;
  onReorder:  (from: number, to: number) => void;
}

export function SceneSidebar({
  scenes, activeId, hoveredId, onSelect, onHover, onAdd, onRemove, onReorder,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, i: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragIdx(i);
  };
  const handleDragOver = (e: React.DragEvent, i: number) => {
    if (dragIdx === null || dragIdx === i) return;
    e.preventDefault();
    setOverIdx(i);
  };
  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null); setOverIdx(null);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.head}>
        <span className={styles.headLabel}>SCENES</span>
        <span className={styles.headCount}>{scenes.length}</span>
      </div>

      <div className={styles.list}>
        {scenes.map(s => {
          const isActive  = s.index === activeId;
          const isHovered = s.index === hoveredId;
          const isDrag    = s.index === dragIdx;
          const isOver    = s.index === overIdx;
          const hasWarn   = Boolean(s.weakness);

          return (
            <div
              key={s.index}
              className={[
                styles.card,
                isActive  && styles.cardActive,
                isHovered && styles.cardHovered,
                isDrag    && styles.cardDrag,
                isOver    && styles.cardDropOver,
                hasWarn   && styles.cardWarn,
              ].filter(Boolean).join(' ')}
              onClick={() => onSelect(s.index)}
              onMouseEnter={() => onHover(s.index)}
              onMouseLeave={() => onHover(null)}
              onDragOver={e => handleDragOver(e, s.index)}
              onDrop={e => handleDrop(e, s.index)}
            >
              {/* Drag handle — only this element starts a drag */}
              <span
                className={styles.dragHandle}
                draggable
                onClick={(e) => e.stopPropagation()}
                onDragStart={(e) => handleDragStart(e, s.index)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                title="Drag to reorder"
              >
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                  <circle cx="2" cy="2"  r="1"/><circle cx="8" cy="2"  r="1"/>
                  <circle cx="2" cy="7"  r="1"/><circle cx="8" cy="7"  r="1"/>
                  <circle cx="2" cy="12" r="1"/><circle cx="8" cy="12" r="1"/>
                </svg>
              </span>

              <div className={styles.thumbWrap}>
                <SceneThumb thumb={s.thumb} size={44} real={s.raw.imageUrl ?? null}/>
                <span className={styles.thumbIdx}>{String(s.index + 1).padStart(2, '0')}</span>
              </div>

              <div className={styles.meta}>
                <div className={styles.metaTop}>
                  <span className={styles.role}>{s.role}</span>
                  <span className={styles.dur}>{s.durationSec.toFixed(1)}s</span>
                </div>
                <div className={styles.titleLine} title={s.title}>{s.title}</div>
                {(s.score !== null || hasWarn || !s.hasImage) && (
                  <div className={styles.statusRow}>
                    {s.score !== null && (
                      <span className={styles.score}>{s.score}</span>
                    )}
                    {!s.hasImage && (
                      <span className={`${styles.chip} ${styles.chipWarn}`}>no image</span>
                    )}
                    {hasWarn && (
                      <span className={`${styles.chip} ${styles.chipErr}`}>weak</span>
                    )}
                  </div>
                )}
              </div>

              <button
                className={styles.removeBtn}
                title="Remove"
                onClick={(e) => { e.stopPropagation(); onRemove(s.index); }}
              >×</button>
            </div>
          );
        })}

        <button className={styles.addScene} onClick={onAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Add scene
        </button>
      </div>

      {/* Health bar — visual summary */}
      <div className={styles.health}>
        <div className={styles.healthTrack}>
          {scenes.map(s => {
            const cls = !s.hasImage     ? styles.hOff
                      : s.weakness      ? styles.hBad
                      : (s.score ?? 0) >= 80 ? styles.hOk
                      : (s.score ?? 0) >= 60 ? styles.hMid
                      : styles.hLow;
            return <span key={s.index} className={`${styles.hCell} ${cls}`}
                         style={{ flex: Math.max(0.6, s.durationSec) }}
                         title={`Scene ${s.index + 1}`}/>;
          })}
        </div>
      </div>
    </aside>
  );
}
