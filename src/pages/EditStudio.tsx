import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { VideoData, SceneData, SceneTransitionPreset, SubtitleStyleOptions } from '@integration/types';
import { reAssembleVideo, regenSceneText, regenerateScene, reGenSceneImage, reGenSceneNarration, getVideoStatus } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import styles from './EditStudio.module.css';

// ─── BGM options ──────────────────────────────────────────────────────────────
const BGM_OPTIONS = [
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

// ─── Transition options ───────────────────────────────────────────────────────
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

export function EditStudio() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { token }   = useAuth();

  // Get video data from router state (passed via navigate) OR fetch from API
  const stateVideo = (location.state as { video?: VideoData } | null)?.video;

  const [videoData,    setVideoData]    = useState<VideoData | null>(stateVideo ?? null);
  const [fetchLoading, setFetchLoading] = useState(!stateVideo);
  const [fetchError,   setFetchError]   = useState<string | null>(null);

  const [scenes, setScenes]           = useState<SceneData[]>(stateVideo?.scenes ?? []);
  const [transitions, setTransitions] = useState<SceneTransitionPreset[]>(
    (stateVideo?.scenes ?? []).map(() => 'auto'),
  );
  const [subPreset, setSubPreset]     = useState('classic');
  const [bgmPath, setBgmPath]         = useState<string>(stateVideo?.options?.bgmPath ?? '');
  const [rendering, setRendering]     = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // Fetch from API when navigated without router state (e.g. from VideoLibrary)
  useEffect(() => {
    // Already have data (from router state or previous fetch) — nothing to do
    if (stateVideo || videoData || !videoId || !token) {
      setFetchLoading(false);
      return;
    }
    let cancelled = false;
    setFetchLoading(true);
    getVideoStatus(videoId, token)
      .then(data => {
        if (cancelled) return;
        setVideoData(data);
        setScenes(data.scenes ?? []);
        setTransitions((data.scenes ?? []).map(() => 'auto' as SceneTransitionPreset));
        setBgmPath((data as any).options?.bgmPath ?? '');
      })
      .catch(e => { if (!cancelled) setFetchError(e.message ?? 'Failed to load video'); })
      .finally(() => { if (!cancelled) setFetchLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, token]); // intentionally omit videoData/stateVideo — only run once on mount

  // Per-scene regen states
  const [regenImg, setRegenImg]     = useState<number | null>(null);
  const [regenAudio, setRegenAudio] = useState<number | null>(null);
  const [regenText, setRegenText]   = useState<{ idx: number; what: string } | null>(null);

  const busy = rendering || regenImg !== null || regenAudio !== null || regenText !== null;

  // ── Scene state helper ─────────────────────────────────────────────────────
  const updateScene = (idx: number, patch: Partial<SceneData>) =>
    setScenes(prev => { const n = [...prev]; n[idx] = { ...prev[idx], ...patch }; return n; });

  const setTrans = (idx: number, val: SceneTransitionPreset) =>
    setTransitions(prev => { const n = [...prev]; n[idx] = val; return n; });

  // ── Image regen ────────────────────────────────────────────────────────────
  const handleRegenImage = useCallback(async (idx: number) => {
    setRegenImg(idx);
    try {
      const s = scenes[idx];
      if (s.id) {
        const result = await reGenSceneImage(s.id, s.imagePrompt ?? '', token ?? undefined);
        updateScene(idx, { imageUrl: result.imageUrl });
      } else {
        const result = await regenerateScene(
          videoId!, idx,
          { regenerateWhat: 'image', imagePrompt: s.imagePrompt, narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined,
        );
        const url = (result as any)?.imageUrl ?? result?.scenes?.[0]?.imageUrl;
        if (url) updateScene(idx, { imageUrl: url });
      }
    } catch (e: any) { alert(`Image regen failed: ${e.message}`); }
    finally { setRegenImg(null); }
  }, [scenes, videoId, token]);

  // ── Audio regen ────────────────────────────────────────────────────────────
  const handleRegenAudio = useCallback(async (idx: number) => {
    setRegenAudio(idx);
    try {
      const s = scenes[idx];
      if (s.id) {
        const result = await reGenSceneNarration(s.id, s.narration ?? '', token ?? undefined);
        updateScene(idx, { audioUrl: result.audioUrl, audioDuration: result.duration });
      } else {
        const result = await regenerateScene(
          videoId!, idx,
          { regenerateWhat: 'audio', narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined,
        );
        const url = (result as any)?.audioUrl ?? result?.scenes?.[0]?.audioUrl;
        if (url) updateScene(idx, { audioUrl: url });
      }
    } catch (e: any) { alert(`Audio regen failed: ${e.message}`); }
    finally { setRegenAudio(null); }
  }, [scenes, videoId, token]);

  // ── Narration AI regen ─────────────────────────────────────────────────────
  const handleRegenNarration = useCallback(async (idx: number) => {
    setRegenText({ idx, what: 'narration' });
    try {
      const s = scenes[idx];
      const result = await regenSceneText(
        videoId!,
        { what: 'narration', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: videoData?.options?.genre },
        token ?? undefined,
      );
      if (result.narration) updateScene(idx, { narration: result.narration });
    } catch (e: any) { alert(`Narration regen failed: ${e.message}`); }
    finally { setRegenText(null); }
  }, [scenes, videoId, videoData, token]);

  // ── ImagePrompt AI regen ───────────────────────────────────────────────────
  const handleRegenImagePrompt = useCallback(async (idx: number) => {
    setRegenText({ idx, what: 'imagePrompt' });
    try {
      const s = scenes[idx];
      const result = await regenSceneText(
        videoId!,
        { what: 'imagePrompt', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: videoData?.options?.genre },
        token ?? undefined,
      );
      if (result.imagePrompt) updateScene(idx, { imagePrompt: result.imagePrompt });
    } catch (e: any) { alert(`Image prompt regen failed: ${e.message}`); }
    finally { setRegenText(null); }
  }, [scenes, videoId, videoData, token]);

  // ── Re-render ──────────────────────────────────────────────────────────────
  const handleRerender = useCallback(async () => {
    setRendering(true);
    setRenderError(null);
    try {
      const preset = SUB_PRESETS.find(p => p.id === subPreset);
      const result = await reAssembleVideo(
        videoId!,
        {
          scenes,
          title:            videoData?.title,
          sceneTransitions: transitions,
          subtitleStyle:    preset?.disabled ? undefined : preset?.style,
          disableSubtitles: preset?.disabled ?? false,
          genre:            videoData?.options?.genre,
          bgmPath:          bgmPath || undefined,
        },
        token ?? undefined,
      );
      setRenderedUrl(result.videoUrl);
    } catch (e: any) {
      setRenderError(e.message ?? 'Re-render failed');
    } finally {
      setRendering(false);
    }
  }, [videoId, scenes, transitions, subPreset, bgmPath, videoData]);

  // Loading state while fetching from API
  if (fetchLoading) {
    return (
      <div className={styles.noData}>
        <span className={styles.loadingSpinner} />
        <p>Loading video…</p>
      </div>
    );
  }

  // Error or truly missing
  if (fetchError || !videoData) {
    return (
      <div className={styles.noData}>
        <p>{fetchError ?? 'Video not found.'}</p>
        <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to Studio</button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>← Back</button>
        <div className={styles.pageTitle}>
          <span className={styles.titleIcon}>✏️</span>
          <div>
            <h1 className={styles.title}>Edit Studio</h1>
            <p className={styles.subtitle}>{videoData.topic}</p>
          </div>
        </div>
        <button
          className={`${styles.rerenderBtn} ${rendering ? styles.rerenderBusy : ''}`}
          onClick={handleRerender}
          disabled={busy}
        >
          {rendering ? <><span className={styles.spin} /> Re-rendering…</> : '▶ Re-render'}
        </button>
      </div>

      {/* ── Controls bar ── */}
      <div className={styles.controls}>
        {/* Subtitle */}
        <div className={styles.ctrlGroup}>
          <span className={styles.ctrlLabel}>Subtitle</span>
          <div className={styles.ctrlRow}>
            {SUB_PRESETS.map(p => (
              <button
                key={p.id}
                className={`${styles.ctrlBtn} ${subPreset === p.id ? styles.ctrlActive : ''}`}
                onClick={() => setSubPreset(p.id)}
                disabled={rendering}
              >{p.label}</button>
            ))}
          </div>
        </div>
        {/* BGM */}
        <div className={styles.ctrlGroup}>
          <span className={styles.ctrlLabel}>Music</span>
          <div className={styles.ctrlRow}>
            {BGM_OPTIONS.map(b => (
              <button
                key={b.id}
                className={`${styles.ctrlBtn} ${bgmPath === b.id ? styles.ctrlActive : ''}`}
                onClick={() => setBgmPath(b.id)}
                disabled={rendering}
              >{b.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Render error / success ── */}
      {renderError && <div className={styles.renderError}>⚠ {renderError}</div>}
      {renderedUrl && (
        <div className={styles.renderSuccess}>
          ✅ Re-rendered!
          <a className={styles.watchLink} href={renderedUrl} target="_blank" rel="noreferrer">Watch →</a>
          <a className={styles.watchLink} href={renderedUrl} download>↓ Download</a>
        </div>
      )}

      {/* ── Scene list ── */}
      <div className={styles.sceneList}>
        {scenes.map((scene, idx) => {
          const isImgBusy   = regenImg === idx;
          const isAudioBusy = regenAudio === idx;
          const isNarrBusy  = regenText?.idx === idx && regenText.what === 'narration';
          const isPrmptBusy = regenText?.idx === idx && regenText.what === 'imagePrompt';

          return (
            <div key={idx} className={styles.sceneCard}>
              {/* ── Scene header ── */}
              <div className={styles.sceneHeader}>
                <div className={styles.sceneHeaderLeft}>
                  <span className={styles.sceneNum}>Scene {idx + 1}</span>
                  <span className={styles.sceneTime}>{scene.time}</span>
                  <span className={styles.sceneTitle}>{scene.scene}</span>
                </div>
                <div className={styles.sceneHeaderRight}>
                  <button className={`${styles.miniBtn} ${isImgBusy ? styles.miniBusy : ''}`}
                    onClick={() => handleRegenImage(idx)} disabled={busy} title="Regen image">
                    {isImgBusy ? '⟳' : '🖼️ Regen Image'}
                  </button>
                  <button className={`${styles.miniBtn} ${isAudioBusy ? styles.miniBusy : ''}`}
                    onClick={() => handleRegenAudio(idx)} disabled={busy} title="Regen audio">
                    {isAudioBusy ? '⟳' : '🎙️ Regen Audio'}
                  </button>
                </div>
              </div>

              {/* ── Scene body ── */}
              <div className={styles.sceneBody}>
                {/* Left: image */}
                <div className={styles.sceneLeft}>
                  {scene.imageUrl
                    ? <img src={scene.imageUrl} className={styles.sceneThumb} alt="" loading="lazy" />
                    : <div className={styles.sceneThumbEmpty}>🎨</div>
                  }
                  {scene.audioUrl && (
                    <audio className={styles.audio} controls src={scene.audioUrl} preload="none" />
                  )}
                </div>

                {/* Right: text fields */}
                <div className={styles.sceneRight}>
                  {/* Narration */}
                  <div className={styles.fieldBlock}>
                    <div className={styles.fieldTop}>
                      <span className={styles.fieldLabel}>Narration</span>
                      <button
                        className={`${styles.aiBtn} ${isNarrBusy ? styles.aiBusy : ''}`}
                        onClick={() => handleRegenNarration(idx)} disabled={busy}>
                        {isNarrBusy ? '⟳ Rewriting…' : '🤖 AI Regen'}
                      </button>
                    </div>
                    <textarea
                      className={styles.textarea}
                      value={scene.narration ?? ''}
                      rows={4}
                      onChange={e => updateScene(idx, { narration: e.target.value })}
                      disabled={busy}
                      placeholder="Narration text…"
                    />
                  </div>

                  {/* Image prompt */}
                  <div className={styles.fieldBlock}>
                    <div className={styles.fieldTop}>
                      <span className={styles.fieldLabel}>Image Prompt</span>
                      <button
                        className={`${styles.aiBtn} ${isPrmptBusy ? styles.aiBusy : ''}`}
                        onClick={() => handleRegenImagePrompt(idx)} disabled={busy}>
                        {isPrmptBusy ? '⟳ Rewriting…' : '🤖 AI Regen'}
                      </button>
                    </div>
                    <textarea
                      className={styles.textarea}
                      value={scene.imagePrompt ?? ''}
                      rows={3}
                      onChange={e => updateScene(idx, { imagePrompt: e.target.value })}
                      disabled={busy}
                      placeholder="Image generation prompt…"
                    />
                  </div>
                </div>
              </div>

              {/* ── Transition picker (between scenes) ── */}
              {idx < scenes.length - 1 && (
                <div className={styles.transPicker}>
                  <div className={styles.transLine} />
                  <div className={styles.transBtns}>
                    {TRANS_OPTIONS.map(t => (
                      <button
                        key={t.id}
                        className={`${styles.transBtn} ${transitions[idx] === t.id ? styles.transActive : ''}`}
                        onClick={() => setTrans(idx, t.id)}
                        disabled={rendering}
                      >{t.label}</button>
                    ))}
                  </div>
                  <div className={styles.transLine} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Sticky re-render footer ── */}
      <div className={styles.footer}>
        {renderError && <span className={styles.footerError}>⚠ {renderError}</span>}
        <button
          className={`${styles.rerenderBtn} ${rendering ? styles.rerenderBusy : ''}`}
          onClick={handleRerender}
          disabled={busy}
        >
          {rendering ? <><span className={styles.spin} /> Re-rendering…</> : '▶ Re-render Video'}
        </button>
      </div>
    </div>
  );
}
