import { useState, useCallback } from 'react';
import type { VideoData, SceneData, SceneTransitionPreset, SubtitleStyleOptions } from '@integration/types';
import { reAssembleVideo } from '@integration/videoApi';
import styles from './VideoStudio.module.css';

// ─── BGM library (mirrors backend BGM_LIBRARY keys) ─────────────────────────
const BGM_OPTIONS: { id: string; label: string }[] = [
  { id: '',           label: '🔇 No music' },
  { id: 'scary1',     label: '👻 Scary' },
  { id: 'history1',   label: '📜 History 1' },
  { id: 'history2',   label: '📜 History 2' },
  { id: 'education1', label: '📚 Education 1' },
  { id: 'education2', label: '📚 Education 2' },
  { id: 'stoic1',     label: '🧘 Stoic 1' },
  { id: 'stoic2',     label: '🧘 Stoic 2' },
  { id: 'trueCrime1', label: '🔪 True Crime 1' },
  { id: 'trueCrime2', label: '🔪 True Crime 2' },
];

// ─── Per-scene transition options ─────────────────────────────────────────────
const TRANS_OPTIONS: { id: SceneTransitionPreset; label: string }[] = [
  { id: 'auto',      label: '🎲 Auto' },
  { id: 'fadeblack', label: '⬛ Fade Black' },
  { id: 'fade',      label: '🌫 Fade' },
  { id: 'wiperight', label: '▶ Wipe →' },
  { id: 'wipeleft',  label: '◀ Wipe ←' },
  { id: 'hard-cut',  label: '⚡ Cut' },
];

// ─── Subtitle presets ─────────────────────────────────────────────────────────
interface SubPreset { id: string; label: string; style?: SubtitleStyleOptions; disabled?: boolean }
const SUB_PRESETS: SubPreset[] = [
  { id: 'classic', label: '🔤 Classic',  style: { fontSize: 18, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 2 } },
  { id: 'yellow',  label: '🟡 Yellow',   style: { fontSize: 20, bold: true,  primaryColor: '#FFE000', outlineColor: '#000000', outlineThickness: 4, alignment: 2 } },
  { id: 'top',     label: '⬆️ Top',      style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 10, marginV: 60 } },
  { id: 'minimal', label: '🤏 Minimal',  style: { fontSize: 14, bold: false, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 1, shadowDepth: 0, alignment: 2 } },
  { id: 'box',     label: '📦 Box',      style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', backgroundBox: true, boxColor: '#000000', boxOpacity: 0.65, alignment: 2 } },
  { id: 'off',     label: '🚫 Off',      disabled: true },
];

interface Props {
  video: VideoData;
  onVideoUpdated?: (newVideoUrl: string) => void;
}

export function VideoStudio({ video, onVideoUpdated }: Props) {
  const [open, setOpen]                   = useState(false);
  const [scenes, setScenes]               = useState<SceneData[]>(video.scenes);
  const [transitions, setTransitions]     = useState<SceneTransitionPreset[]>(
    video.scenes.map(() => 'auto'),
  );
  const [subPreset, setSubPreset]         = useState('classic');
  const [bgmPath, setBgmPath]             = useState<string>(video.options?.bgmPath ?? '');
  const [regenIdx, setRegenIdx]           = useState<number | null>(null);
  const [rendering, setRendering]         = useState(false);
  const [renderError, setRenderError]     = useState<string | null>(null);
  const [expandedPrompt, setExpandedPrompt] = useState<number | null>(null);

  // ── Image regeneration ─────────────────────────────────────────────────────
  const handleRegenImage = useCallback(async (idx: number) => {
    setRegenIdx(idx);
    const scene = scenes[idx];
    try {
      const res = await fetch(`/api/video/${video.videoId}/regenerate/${idx}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerateWhat: 'image',
          imagePrompt:    scene.imagePrompt,
          narration:      scene.narration,
          time:           scene.time,
          scene:          scene.scene,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `HTTP ${res.status}`);
      }
      const json = await res.json();
      const newImageUrl: string | undefined =
        json?.data?.imageUrl ?? json?.data?.scenes?.[0]?.imageUrl;
      if (newImageUrl) {
        setScenes(prev => {
          const next = [...prev];
          next[idx] = { ...prev[idx], imageUrl: newImageUrl };
          return next;
        });
      }
    } catch (e: any) {
      alert(`Image regeneration failed: ${e.message}`);
    } finally {
      setRegenIdx(null);
    }
  }, [video.videoId, scenes]);

  // ── Re-render ─────────────────────────────────────────────────────────────
  const handleRerender = useCallback(async () => {
    setRendering(true);
    setRenderError(null);
    try {
      const preset = SUB_PRESETS.find(p => p.id === subPreset);
      const result = await reAssembleVideo(video.videoId, {
        scenes,
        title:            video.title,
        sceneTransitions: transitions,
        subtitleStyle:    preset?.disabled ? undefined : preset?.style,
        disableSubtitles: preset?.disabled ?? false,
        genre:            video.options?.genre,
        bgmPath:          bgmPath || undefined,
      });
      onVideoUpdated?.(result.videoUrl);
    } catch (e: any) {
      setRenderError(e.message ?? 'Re-render failed');
    } finally {
      setRendering(false);
    }
  }, [video, scenes, transitions, subPreset, onVideoUpdated]);

  // ── Transition setter ──────────────────────────────────────────────────────
  const setTrans = (gapIdx: number, val: SceneTransitionPreset) =>
    setTransitions(prev => { const n = [...prev]; n[gapIdx] = val; return n; });

  return (
    <div className={styles.studio}>
      {/* Toggle header */}
      <button className={styles.toggleBtn} onClick={() => setOpen(o => !o)}>
        <span className={styles.toggleIcon}>🎬</span>
        Scene Studio
        <span className={styles.toggleArrow}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.body}>

          {/* ── Subtitle style row ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Subtitle Style</div>
            <div className={styles.subRow}>
              {SUB_PRESETS.map(p => (
                <button
                  key={p.id}
                  className={`${styles.subBtn} ${subPreset === p.id ? styles.subActive : ''}`}
                  onClick={() => setSubPreset(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── BGM row ── */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>Background Music</div>
            <div className={styles.subRow}>
              {BGM_OPTIONS.map(b => (
                <button
                  key={b.id}
                  className={`${styles.subBtn} ${bgmPath === b.id ? styles.subActive : ''}`}
                  onClick={() => setBgmPath(b.id)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Scene list ── */}
          <div className={styles.sceneList}>
            {scenes.map((scene, i) => (
              <div key={i} className={styles.sceneRow}>

                {/* Scene card */}
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.cardNum}>#{i + 1}</span>
                    <span className={styles.cardTime}>{scene.time}</span>
                  </div>

                  {scene.imageUrl && (
                    <div className={styles.thumbWrap}>
                      <img
                        src={scene.imageUrl}
                        className={styles.thumb}
                        alt={`Scene ${i + 1}`}
                        loading="lazy"
                      />
                      <button
                        className={`${styles.regenBtn} ${regenIdx === i ? styles.regenLoading : ''}`}
                        onClick={() => handleRegenImage(i)}
                        disabled={regenIdx !== null || rendering}
                        title="Regenerate image"
                      >
                        {regenIdx === i ? '⟳' : '🔄'}
                      </button>
                    </div>
                  )}

                  <p className={styles.narration}>
                    {scene.narration || scene.description}
                  </p>

                  {scene.imagePrompt && (
                    <div className={styles.promptWrap}>
                      <button
                        className={styles.promptToggle}
                        onClick={() => setExpandedPrompt(expandedPrompt === i ? null : i)}
                      >
                        {expandedPrompt === i ? '▲ Hide prompt' : '▼ Image prompt'}
                      </button>
                      {expandedPrompt === i && (
                        <p className={styles.prompt}>{scene.imagePrompt}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Transition picker between scenes */}
                {i < scenes.length - 1 && (
                  <div className={styles.transPicker}>
                    <div className={styles.transLine} />
                    <div className={styles.transBtns}>
                      {TRANS_OPTIONS.map(t => (
                        <button
                          key={t.id}
                          className={`${styles.transBtn} ${transitions[i] === t.id ? styles.transActive : ''}`}
                          onClick={() => setTrans(i, t.id)}
                          title={t.label}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className={styles.transLine} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Re-render button ── */}
          <div className={styles.footer}>
            {renderError && <p className={styles.error}>⚠ {renderError}</p>}
            <button
              className={`${styles.rerenderBtn} ${rendering ? styles.rerenderLoading : ''}`}
              onClick={handleRerender}
              disabled={rendering || regenIdx !== null}
            >
              {rendering ? (
                <><span className={styles.spinner} /> Re-rendering…</>
              ) : (
                <>▶ Re-render Video</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
