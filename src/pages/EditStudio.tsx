import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { VideoData, SceneData, SceneTransitionPreset, SubtitleStyleOptions } from '@integration/types';
import { reAssembleVideo, regenSceneText, regenerateScene, reGenSceneImage, reGenSceneNarration, getVideoStatus, uploadAsset } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import { QualityReport } from '../components/QualityReport';
import type { VideoEvaluation } from '../integration/evaluationApi';
import styles from './EditStudio.module.css';

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const Icon = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>
    </svg>
  ),
  Mic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  ),
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
  Music: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
};

// ─── BGM options (keep one icon per option for visual rhythm) ────────────────
const BGM_OPTIONS = [
  { id: '',           label: 'No music' },
  { id: 'scary1',     label: 'Scary' },
  { id: 'history1',   label: 'History 1' },
  { id: 'history2',   label: 'History 2' },
  { id: 'education1', label: 'Education 1' },
  { id: 'education2', label: 'Education 2' },
  { id: 'stoic1',     label: 'Stoic 1' },
  { id: 'stoic2',     label: 'Stoic 2' },
  { id: 'trueCrime1', label: 'True Crime 1' },
  { id: 'trueCrime2', label: 'True Crime 2' },
];

// ─── Transition options ───────────────────────────────────────────────────────
const TRANS_OPTIONS: { id: SceneTransitionPreset; label: string }[] = [
  { id: 'auto',      label: 'Auto' },
  { id: 'fadeblack', label: 'Fade Black' },
  { id: 'fade',      label: 'Fade' },
  { id: 'wiperight', label: 'Wipe →' },
  { id: 'wipeleft',  label: '← Wipe' },
  { id: 'hard-cut',  label: 'Cut' },
];

// ─── Subtitle presets ─────────────────────────────────────────────────────────
interface SubPreset { id: string; label: string; style?: SubtitleStyleOptions; disabled?: boolean }
const SUB_PRESETS: SubPreset[] = [
  { id: 'classic', label: 'Classic',  style: { fontSize: 18, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 2 } },
  { id: 'yellow',  label: 'Yellow',   style: { fontSize: 20, bold: true,  primaryColor: '#FFE000', outlineColor: '#000000', outlineThickness: 4, alignment: 2 } },
  { id: 'top',     label: 'Top',      style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 10, marginV: 60 } },
  { id: 'minimal', label: 'Minimal',  style: { fontSize: 14, bold: false, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 1, shadowDepth: 0, alignment: 2 } },
  { id: 'box',     label: 'Boxed',    style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', backgroundBox: true, boxColor: '#000000', boxOpacity: 0.65, alignment: 2 } },
  { id: 'off',     label: 'Off',      disabled: true },
];

const SAMPLE_TEXT = 'Sample subtitle';

/** Small faux-video text sample so users can see how each preset will render */
function SubtitleSample({ preset }: { preset: SubPreset }) {
  const s = preset.style;
  if (!s) return null;
  // Translate ASS-ish outline thickness into a CSS text-shadow stack
  const o = s.outlineThickness ?? 2;
  const oc = s.outlineColor ?? '#000';
  const outline = [
    `${ o}px  ${ o}px 0 ${oc}`,
    `${-o}px  ${ o}px 0 ${oc}`,
    `${ o}px  ${-o}px 0 ${oc}`,
    `${-o}px  ${-o}px 0 ${oc}`,
    `0 0 6px ${oc}`,
  ].join(', ');

  const style: React.CSSProperties = {
    color:      s.primaryColor ?? '#fff',
    fontWeight: s.bold ? 800 : 500,
    fontSize:   Math.max(10, (s.fontSize ?? 14) * 0.55) + 'px',
    textShadow: s.shadowDepth === 0 ? 'none' : outline,
    padding:    s.backgroundBox ? '3px 7px' : '0',
    background: s.backgroundBox ? (s.boxColor ?? '#000') : 'transparent',
    borderRadius: s.backgroundBox ? '3px' : 0,
    opacity:    s.backgroundBox && s.boxOpacity ? Math.max(0.5, s.boxOpacity) : 1,
    lineHeight: 1.2,
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{SAMPLE_TEXT}</span>;
}

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
  }, [videoId, token]);

  // Per-scene regen states
  const [regenImg, setRegenImg]     = useState<number | null>(null);
  const [regenAudio, setRegenAudio] = useState<number | null>(null);
  const [regenText, setRegenText]   = useState<{ idx: number; what: string } | null>(null);

  // Per-scene custom-upload busy states
  const [uploadImg, setUploadImg]     = useState<number | null>(null);
  const [uploadAudio, setUploadAudio] = useState<number | null>(null);
  const [uploadingBgm, setUploadingBgm] = useState(false);
  const [customBgmName, setCustomBgmName] = useState<string | null>(null);

  // ── BGM preview audio (shared player, one track at a time) ──
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const BGM_BASE_URL =
    typeof (import.meta as any).env !== 'undefined'
      ? ((import.meta as any).env.VITE_API_URL ?? '')
      : '';
  const playBgmPreview = (bgmId: string) => {
    if (!bgmId) return;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewPlaying === bgmId) { setPreviewPlaying(null); return; }
    const audio = new Audio(`${BGM_BASE_URL}/bgm/${bgmId}.mp3`);
    audio.volume = 0.7;
    audio.onended = () => setPreviewPlaying(null);
    audio.onerror = () => setPreviewPlaying(null);
    previewAudioRef.current = audio;
    setPreviewPlaying(bgmId);
    audio.play().catch(() => setPreviewPlaying(null));
  };
  useEffect(() => () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  }, []);

  // Which scene the QualityReport is currently highlighting (for ring effect)
  const [highlightScene, setHighlightScene] = useState<number | null>(null);

  // Evaluation data lifted from <QualityReport/> — used to render per-scene
  // weakness warning chips on each scene card.
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null>(null);
  const weaknessMap = (() => {
    const m = new Map<number, { score: number; weakness: string }>();
    evaluation?.sceneScores?.forEach(s => {
      if (s.weakness) m.set(s.sceneIndex, { score: s.score, weakness: s.weakness });
    });
    return m;
  })();

  const busy = rendering
    || regenImg !== null   || regenAudio !== null   || regenText !== null
    || uploadImg !== null  || uploadAudio !== null  || uploadingBgm;

  // ── Scene state helpers ────────────────────────────────────────────────────
  const updateScene = (idx: number, patch: Partial<SceneData>) =>
    setScenes(prev => { const n = [...prev]; n[idx] = { ...prev[idx], ...patch }; return n; });

  const setTrans = (idx: number, val: SceneTransitionPreset) =>
    setTransitions(prev => { const n = [...prev]; n[idx] = val; return n; });

  // ── Add new (empty) scene ──────────────────────────────────────────────────
  const handleAddScene = useCallback(() => {
    setScenes(prev => {
      // Default time slot: pick up after the previous scene
      const lastTime = prev[prev.length - 1]?.time ?? '0:00-0:05';
      const lastEnd  = parseInt((lastTime.split('-')[1] || '0:05').split(':')[1] || '5', 10);
      const newStart = lastEnd;
      const newEnd   = lastEnd + 5;
      const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      const newScene = {
        time:          `${fmt(newStart)}-${fmt(newEnd)}`,
        scene:         `Scene ${prev.length + 1}`,
        narration:     '',
        imagePrompt:   '',
        imageUrl:      undefined,
        audioUrl:      undefined,
        audioDuration: 5,
      } as unknown as SceneData;
      return [...prev, newScene];
    });
    setTransitions(prev => [...prev, 'auto']);
  }, []);

  // ── Remove a scene ─────────────────────────────────────────────────────────
  const handleRemoveScene = useCallback((idx: number) => {
    if (!confirm(`Scene ${idx + 1} устгах уу?`)) return;
    setScenes(prev => prev.filter((_, i) => i !== idx));
    setTransitions(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Reorder scenes (drag-to-swap) ──────────────────────────────────────────
  const [dragSceneIdx,    setDragSceneIdx]    = useState<number | null>(null);
  const [dragOverScene,   setDragOverScene]   = useState<number | null>(null);

  const handleSceneDragStart = useCallback((idx: number) => {
    setDragSceneIdx(idx);
  }, []);
  const handleSceneDragOver = useCallback((e: React.DragEvent, idx: number) => {
    if (dragSceneIdx === null || dragSceneIdx === idx) return;
    e.preventDefault();
    setDragOverScene(idx);
  }, [dragSceneIdx]);
  const handleSceneDrop = useCallback((targetIdx: number) => {
    if (dragSceneIdx === null || dragSceneIdx === targetIdx) {
      setDragSceneIdx(null); setDragOverScene(null);
      return;
    }
    setScenes(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragSceneIdx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    setTransitions(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(dragSceneIdx, 1);
      copy.splice(targetIdx, 0, moved);
      return copy;
    });
    setDragSceneIdx(null); setDragOverScene(null);
  }, [dragSceneIdx]);
  const handleSceneDragEnd = useCallback(() => {
    setDragSceneIdx(null); setDragOverScene(null);
  }, []);

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

  // ── Custom uploads (image / audio / bgm) ───────────────────────────────────
  const handleUploadImage = useCallback(async (idx: number, file: File) => {
    setUploadImg(idx);
    try {
      const sceneId = scenes[idx].id;
      const { url } = await uploadAsset('image', file, sceneId, token ?? undefined);
      updateScene(idx, { imageUrl: url });
    } catch (e: any) { alert(`Image upload failed: ${e.message}`); }
    finally { setUploadImg(null); }
  }, [scenes, token]);

  const handleUploadAudio = useCallback(async (idx: number, file: File) => {
    setUploadAudio(idx);
    try {
      const sceneId = scenes[idx].id;
      const { url } = await uploadAsset('audio', file, sceneId, token ?? undefined);
      const dur = await new Promise<number>(resolve => {
        const a = document.createElement('audio');
        a.preload = 'metadata';
        a.onloadedmetadata = () => resolve(isFinite(a.duration) ? a.duration : 0);
        a.onerror = () => resolve(0);
        a.src = URL.createObjectURL(file);
      });
      updateScene(idx, { audioUrl: url, audioDuration: dur || scenes[idx].audioDuration });
    } catch (e: any) { alert(`Audio upload failed: ${e.message}`); }
    finally { setUploadAudio(null); }
  }, [scenes, token]);

  const handleUploadBgm = useCallback(async (file: File) => {
    setUploadingBgm(true);
    try {
      const { url } = await uploadAsset('bgm', file, undefined, token ?? undefined);
      setBgmPath(url);
      setCustomBgmName(file.name);
    } catch (e: any) { alert(`BGM upload failed: ${e.message}`); }
    finally { setUploadingBgm(false); }
  }, [token]);

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

  if (fetchError || !videoData) {
    return (
      <div className={styles.noData}>
        <p>{fetchError ?? 'Video not found.'}</p>
        <button className={styles.backBtn} onClick={() => navigate('/')}>
          <Icon.ArrowLeft /> Back to Studio
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <Icon.ArrowLeft /> Back
        </button>
        <div className={styles.pageTitle}>
          <span className={styles.titleIcon}><Icon.Edit /></span>
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
          {rendering ? <><span className={styles.spin} /> Re-rendering…</> : <><Icon.Play /> Re-render</>}
        </button>
      </div>

      {/* ── Controls bar ── */}
      <div className={styles.controls}>

        {/* ── Subtitle picker with live visual previews ── */}
        <div className={styles.ctrlSection}>
          <div className={styles.ctrlHeader}>
            <span className={styles.ctrlLabel}>Subtitle Style</span>
            <span className={styles.ctrlHelper}>Видеоны хадмал хэрхэн харагдахыг сонгоно</span>
          </div>
          <div className={styles.subPresetGrid}>
            {SUB_PRESETS.map(p => {
              const active = subPreset === p.id;
              const isOff = p.disabled;
              return (
                <button
                  key={p.id}
                  className={`${styles.subPresetCard} ${active ? styles.subPresetActive : ''}`}
                  onClick={() => setSubPreset(p.id)}
                  disabled={rendering}
                  type="button"
                >
                  {/* Faux video preview area */}
                  <div className={`${styles.subPreviewStage} ${p.id === 'top' ? styles.subStageTop : ''}`}>
                    {isOff
                      ? <span className={styles.subOffMark}>No subtitles</span>
                      : <SubtitleSample preset={p} />}
                  </div>
                  <div className={styles.subPresetLabel}>{p.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Background Music with play preview ── */}
        <div className={styles.ctrlSection}>
          <div className={styles.ctrlHeader}>
            <span className={styles.ctrlLabel}>Background Music</span>
            <span className={styles.ctrlHelper}>Тоглуулах товч дарж сонсох</span>
          </div>
          <div className={styles.bgmGrid}>
            {BGM_OPTIONS.map(b => {
              const active = bgmPath === b.id && !customBgmName;
              const playing = previewPlaying === b.id;
              return (
                <div
                  key={b.id || 'none'}
                  className={`${styles.bgmCard} ${active ? styles.bgmCardActive : ''}`}
                >
                  <button
                    type="button"
                    className={styles.bgmSelect}
                    onClick={() => { setBgmPath(b.id); setCustomBgmName(null); }}
                    disabled={busy}
                  >
                    <span className={styles.bgmDot} style={{ opacity: active ? 1 : 0.25 }} />
                    <span>{b.label}</span>
                  </button>
                  {b.id && (
                    <button
                      type="button"
                      className={`${styles.bgmPlay} ${playing ? styles.bgmPlaying : ''}`}
                      onClick={() => playBgmPreview(b.id)}
                      disabled={busy}
                      title={playing ? 'Зогсоох' : 'Сонсох'}
                    >
                      {playing
                        ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                        : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Custom BGM upload tile */}
            <label
              className={`${styles.bgmCard} ${styles.bgmCardUpload} ${customBgmName ? styles.bgmCardActive : ''} ${uploadingBgm ? styles.ctrlBtnBusy : ''}`}
              style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
              title="Upload your own BGM (.mp3, .wav)"
            >
              <span className={styles.bgmSelect} style={{ pointerEvents: 'none' }}>
                {uploadingBgm
                  ? <><Icon.Refresh /> Uploading…</>
                  : customBgmName
                    ? <><Icon.Music /> {customBgmName.length > 14 ? customBgmName.slice(0, 12) + '…' : customBgmName}</>
                    : <><Icon.Plus /> Custom BGM</>}
              </span>
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                disabled={busy}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleUploadBgm(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Render error / success ── */}
      {renderError && <div className={styles.renderError}>{renderError}</div>}
      {renderedUrl && (
        <div className={styles.renderSuccess}>
          <span>Re-rendered successfully</span>
          <a className={styles.watchLink} href={renderedUrl} target="_blank" rel="noreferrer">Watch →</a>
          <a className={styles.watchLink} href={renderedUrl} download>Download ↓</a>
        </div>
      )}

      {/* ── Quality Report ── */}
      {videoId && (
        <QualityReport
          videoId={videoId}
          token={token ?? undefined}
          onSceneHover={setHighlightScene}
          onEvaluation={setEvaluation}
        />
      )}

      {/* ── Scene list ── */}
      <div className={styles.sceneList}>
        {scenes.map((scene, idx) => {
          const isImgBusy   = regenImg === idx;
          const isAudioBusy = regenAudio === idx;
          const isNarrBusy  = regenText?.idx === idx && regenText.what === 'narration';
          const isPrmptBusy = regenText?.idx === idx && regenText.what === 'imagePrompt';
          const isHighlighted = highlightScene === idx;

          const isDragSource = dragSceneIdx === idx;
          const isDropTarget = dragOverScene === idx;

          return (
            <div key={idx}
                 className={`${styles.sceneCard} ${isHighlighted ? styles.sceneHighlighted : ''} ${isDragSource ? styles.sceneDragging : ''} ${isDropTarget ? styles.sceneDropOver : ''}`}
                 onDragOver={e => handleSceneDragOver(e, idx)}
                 onDrop={() => handleSceneDrop(idx)}>
              {/* ── Scene header ── */}
              <div className={styles.sceneHeader}>
                <div className={styles.sceneHeaderLeft}>
                  <span
                    className={styles.dragHandle}
                    draggable
                    onDragStart={() => handleSceneDragStart(idx)}
                    onDragEnd={handleSceneDragEnd}
                    title="Drag to reorder"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                    </svg>
                  </span>
                  <span className={styles.sceneNum}>Scene {idx + 1}</span>
                  <span className={styles.sceneTime}>{scene.time}</span>
                  <span className={styles.sceneTitle}>{scene.scene}</span>
                </div>
                <div className={styles.sceneHeaderRight}>
                  <button className={`${styles.miniBtn} ${isImgBusy ? styles.miniBusy : ''}`}
                    onClick={() => handleRegenImage(idx)} disabled={busy} title="Regenerate image">
                    {isImgBusy ? <Icon.Refresh /> : <><Icon.Refresh /> Image</>}
                  </button>

                  {/* Custom image upload */}
                  <label className={`${styles.miniBtn} ${uploadImg === idx ? styles.miniBusy : ''}`}
                         style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
                         title="Upload your own image">
                    {uploadImg === idx ? <Icon.Refresh /> : <><Icon.Upload /> Upload</>}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={busy}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadImage(idx, f);
                        e.target.value = '';
                      }} />
                  </label>

                  <button className={`${styles.miniBtn} ${isAudioBusy ? styles.miniBusy : ''}`}
                    onClick={() => handleRegenAudio(idx)} disabled={busy} title="Regenerate audio">
                    {isAudioBusy ? <Icon.Refresh /> : <><Icon.Mic /> Audio</>}
                  </button>

                  {/* Custom audio upload */}
                  <label className={`${styles.miniBtn} ${uploadAudio === idx ? styles.miniBusy : ''}`}
                         style={{ cursor: busy ? 'not-allowed' : 'pointer' }}
                         title="Upload your own audio">
                    {uploadAudio === idx ? <Icon.Refresh /> : <><Icon.Upload /> Upload</>}
                    <input type="file" accept="audio/*" style={{ display: 'none' }} disabled={busy}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadAudio(idx, f);
                        e.target.value = '';
                      }} />
                  </label>

                  {/* Remove scene */}
                  <button
                    className={`${styles.miniBtn} ${styles.removeBtn}`}
                    onClick={() => handleRemoveScene(idx)}
                    disabled={busy}
                    title="Remove scene"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Scene body ── */}
              <div className={styles.sceneBody}>
                {/* Left: image + media status + AI warning */}
                <div className={styles.sceneLeft}>
                  {scene.imageUrl
                    ? <img src={scene.imageUrl} className={styles.sceneThumb} alt="" loading="lazy" />
                    : <div className={styles.sceneThumbEmpty}><Icon.Image /></div>
                  }

                  {/* Media-readiness badges (image / audio) */}
                  <div className={styles.mediaStatus}>
                    <span className={`${styles.statusChip} ${scene.imageUrl ? styles.statusOk : styles.statusMissing}`}
                          title={scene.imageUrl ? 'Image ready' : 'No image yet'}>
                      <Icon.Image />
                    </span>
                    <span className={`${styles.statusChip} ${scene.audioUrl ? styles.statusOk : styles.statusMissing}`}
                          title={scene.audioUrl ? 'Audio ready' : 'No audio yet'}>
                      <Icon.Mic />
                    </span>
                  </div>

                  {scene.audioUrl && (
                    <audio className={styles.audio} controls src={scene.audioUrl} preload="none" />
                  )}

                  {/* AI weakness warning for this specific scene */}
                  {weaknessMap.get(idx) && (
                    <div className={styles.sceneWeakness}>
                      <div className={styles.sceneWeaknessHead}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                          <line x1="12" y1="9"  x2="12" y2="13"/>
                          <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                        <span>AI WARNING</span>
                        <span className={styles.sceneWeaknessScore}>{weaknessMap.get(idx)!.score}/100</span>
                      </div>
                      <p className={styles.sceneWeaknessText}>
                        {weaknessMap.get(idx)!.weakness}
                      </p>
                    </div>
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
                        {isNarrBusy ? <><Icon.Refresh /> Rewriting…</> : <><Icon.Sparkles /> AI rewrite</>}
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
                        {isPrmptBusy ? <><Icon.Refresh /> Rewriting…</> : <><Icon.Sparkles /> AI rewrite</>}
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

        {/* ── Add new scene button ── */}
        <button
          type="button"
          className={styles.addSceneBtn}
          onClick={handleAddScene}
          disabled={busy}
        >
          <Icon.Plus /> Add new scene
        </button>
      </div>

      {/* ── Sticky re-render footer ── */}
      <div className={styles.footer}>
        {renderError && <span className={styles.footerError}>{renderError}</span>}
        <button
          className={`${styles.rerenderBtn} ${rendering ? styles.rerenderBusy : ''}`}
          onClick={handleRerender}
          disabled={busy}
        >
          {rendering ? <><span className={styles.spin} /> Re-rendering…</> : <><Icon.Play /> Re-render Video</>}
        </button>
      </div>
    </div>
  );
}
