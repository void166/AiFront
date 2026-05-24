import { useEffect, useRef, useState } from 'react';
import type { SceneVM } from './types';
import { SceneThumb } from './SceneThumb';
import styles from './PreviewStage.module.css';

interface Props {
  scene:        SceneVM | null;
  videoUrl?:    string | null;
  cursor:       number;
  total:        number;
  sceneStart:   number;
  playing:      boolean;
  onPlay:       () => void;
  onPause:      () => void;
  onSeek:       (sec: number) => void;
  regenImage?:  boolean;
  regenAudio?:  boolean;
  subtitlePreview?: string;
  subtitleStyle?:   React.CSSProperties;
}

function fmt(n: number) {
  if (!isFinite(n) || n < 0) n = 0;
  const m = Math.floor(n / 60);
  const s = (n % 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}

export function PreviewStage({
  scene, videoUrl, cursor, total, sceneStart, playing,
  onPlay, onPause, onSeek, regenImage, regenAudio,
  subtitlePreview, subtitleStyle,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // `videoReady` flips true once metadata is loaded — seeks before that
  // are silently no-op'd by the browser, so we re-apply them on ready.
  const [videoReady, setVideoReady] = useState(false);
  const pendingSeekRef = useRef<number | null>(null);

  /* Seek when the cursor diverges from the video's currentTime.
     Tight tolerance (0.05s) ensures scene-clicks land exactly on the start. */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (!videoReady) { pendingSeekRef.current = cursor; return; }
    if (Math.abs(v.currentTime - cursor) > 0.05) {
      try { v.currentTime = cursor; } catch {}
    }
  }, [cursor, videoUrl, videoReady]);

  /* Also seek immediately on scene change (covers same-scene-clicked-twice). */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    if (!videoReady) { pendingSeekRef.current = sceneStart; return; }
    try { v.currentTime = sceneStart; } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene?.index, videoUrl, videoReady]);

  /* Play / pause sync. */
  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (playing) {
      v?.play().catch(() => {});
      a?.play().catch(() => {});
    } else {
      v?.pause();
      a?.pause();
    }
  }, [playing, scene?.raw?.audioUrl, videoUrl]);

  /* Throttle timeupdate to ~10fps. The native event fires at ~250ms intervals
     in Chrome but combined with React re-renders we still saw stutter. */
  const lastUpdate = useRef(0);
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    const now = performance.now();
    if (now - lastUpdate.current < 100) return;
    lastUpdate.current = now;
    onSeek(v.currentTime);
  };

  const onLoadedMeta = () => {
    setVideoReady(true);
    if (pendingSeekRef.current != null && videoRef.current) {
      try { videoRef.current.currentTime = pendingSeekRef.current; } catch {}
      pendingSeekRef.current = null;
    }
  };

  /* ── Scrubber drag handling ─────────────────────────────────────────── */
  const scrubRef = useRef<HTMLDivElement | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const seekFromPointer = (clientX: number) => {
    const el = scrubRef.current; if (!el || total <= 0) return;
    const r = el.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onSeek(pct * total);
  };

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
  }, [scrubbing, total]);

  if (!scene) {
    return <div className={styles.stage}><div className={styles.empty}>No scene selected</div></div>;
  }

  const pct = total > 0 ? (cursor / total) * 100 : 0;

  return (
    <div className={styles.stage}>
      <div className={`${styles.frame} ${regenImage ? styles.frameBlur : ''}`}>
        {/* Top overlay */}
        <div className={styles.overlayTop}>
          <span className={styles.scenePill}>
            SCENE <b>{String(scene.index + 1).padStart(2, '0')}</b>
          </span>
          <span className={styles.timePill}>{fmt(cursor)} / {fmt(total)}</span>
        </div>

        {videoUrl
          ? <video
              ref={videoRef}
              src={videoUrl}
              className={styles.video}
              playsInline
              preload="auto"
              onLoadedMetadata={onLoadedMeta}
              onTimeUpdate={onTimeUpdate}
              onEnded={onPause}
            />
          : scene.raw.imageUrl
            ? <img className={styles.image} src={scene.raw.imageUrl} alt=""/>
            : <div className={styles.proceduralWrap}>
                <SceneThumb thumb={scene.thumb} size={420} real={null}/>
              </div>}

        {!videoUrl && subtitlePreview && (
          <div className={styles.subtitleLayer}>
            <span style={subtitleStyle}>{subtitlePreview}</span>
          </div>
        )}

        {(regenImage || regenAudio) && (
          <div className={styles.regenOverlay}>
            <span className={styles.spinner}/>
            <span>Regenerating {regenImage ? 'image' : 'audio'}…</span>
          </div>
        )}

        {!playing && !regenImage && !regenAudio && (
          <button className={styles.centerPlay} onClick={onPlay} aria-label="Play">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        )}

        {/* ── Bottom scrubber overlay ─────────────────────────────────── */}
        <div className={styles.scrubBar}>
          <button className={styles.scrubPlay} onClick={playing ? onPause : onPlay}
                  aria-label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
              : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
          </button>
          <button className={styles.scrubMini} title="-1s"
                  onClick={() => onSeek(Math.max(0, cursor - 1))}>−1s</button>
          <button className={styles.scrubMini} title="+1s"
                  onClick={() => onSeek(Math.min(total, cursor + 1))}>+1s</button>

          <div className={styles.scrubTrack}
               ref={scrubRef}
               onMouseDown={(e) => { setScrubbing(true); seekFromPointer(e.clientX); }}>
            <div className={styles.scrubFill} style={{ width: `${pct}%` }}/>
            <div className={styles.scrubHead} style={{ left: `${pct}%` }}/>
          </div>

          <span className={styles.scrubTime}>{fmt(cursor)}</span>
        </div>
      </div>

      {!videoUrl && scene.raw.audioUrl && (
        <audio ref={audioRef} src={scene.raw.audioUrl} preload="metadata"/>
      )}
    </div>
  );
}
