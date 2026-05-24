/* EditStudio — 3-column dark editor UI (rebuild)
   --------------------------------------------------------------------------
   Composition:
     <TopBar/>
     <main 3-col grid>
       <SceneSidebar/>
       <Center>
         <PreviewStage/>
         <EditForm/>
         <Timeline/>
       </Center>
       <QualityPane/>
     </main>
     <Toasts/>
   Backend wiring (reAssembleVideo, regen*, uploadAsset, BGM/subtitle picks)
   is preserved verbatim from the previous EditStudio.                       */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type {
  VideoData, SceneData, SceneTransitionPreset, SubtitleStyleOptions,
} from '@integration/types';
import {
  reAssembleVideo, regenSceneText, regenerateScene,
  reGenSceneImage, reGenSceneNarration, getVideoStatus, uploadAsset,
} from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import type { VideoEvaluation } from '../integration/evaluationApi';

import {
  TopBar, SceneSidebar, PreviewStage, EditForm, Timeline, QualityPane,
  Toasts, useToasts, toVM, type SceneVM, type VideoStatus,
  type SubPreset, type BgmOption,
} from '../components/editstudio';

import '../components/editstudio/tokens.css';
import styles from './EditStudio.module.css';

// ─── Static pickers ──────────────────────────────────────────────────────────
const BGM_OPTIONS: BgmOption[] = [
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

const TRANS_OPTIONS: { id: SceneTransitionPreset; label: string }[] = [
  { id: 'auto',      label: 'Auto' },
  { id: 'hard-cut',  label: 'Cut' },
  { id: 'fade',      label: 'Fade' },
  { id: 'fadeblack', label: 'Fade Black' },
  { id: 'wiperight', label: 'Wipe →' },
  { id: 'wipeleft',  label: '← Wipe' },
];

const SUB_PRESETS: SubPreset[] = [
  { id: 'classic', label: 'Classic',  style: { fontSize: 18, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 2 } },
  { id: 'yellow',  label: 'Yellow',   style: { fontSize: 20, bold: true,  primaryColor: '#FFE000', outlineColor: '#000000', outlineThickness: 4, alignment: 2 } },
  { id: 'top',     label: 'Top',      style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 10, marginV: 60 } },
  { id: 'minimal', label: 'Minimal',  style: { fontSize: 14, bold: false, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 1, shadowDepth: 0, alignment: 2 } },
  { id: 'box',     label: 'Boxed',    style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', backgroundBox: true, boxColor: '#000000', boxOpacity: 0.65, alignment: 2 } },
  { id: 'off',     label: 'Off',      disabled: true },
];

const VOICE_OPTIONS = [
  { id: 'aria-confident',   label: 'Aria — confident' },
  { id: 'aria-warm',        label: 'Aria — warm' },
  { id: 'liam-narrator',    label: 'Liam — narrator' },
  { id: 'mongol-default',   label: 'Mongol — default' },
];

// ─── Subtitle inline-style helper for the burned preview on stage ───────────
function subtitleInlineStyle(p: SubPreset | undefined): React.CSSProperties {
  if (!p?.style) return {};
  const s = p.style;
  const o = s.outlineThickness ?? 2;
  const oc = s.outlineColor ?? '#000';
  return {
    color: s.primaryColor ?? '#fff',
    fontWeight: s.bold ? 800 : 500,
    fontSize: Math.max(14, (s.fontSize ?? 14)) + 'px',
    textShadow: s.shadowDepth === 0 ? 'none' :
      `${o}px ${o}px 0 ${oc}, ${-o}px ${o}px 0 ${oc}, ${o}px ${-o}px 0 ${oc}, ${-o}px ${-o}px 0 ${oc}, 0 0 6px ${oc}`,
    padding: s.backgroundBox ? '4px 10px' : 0,
    background: s.backgroundBox ? (s.boxColor ?? '#000') : 'transparent',
    borderRadius: s.backgroundBox ? 4 : 0,
    opacity: s.backgroundBox && s.boxOpacity ? Math.max(0.55, s.boxOpacity) : 1,
    lineHeight: 1.25,
  };
}

export function EditStudio() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate    = useNavigate();
  const location    = useLocation();
  const { token }   = useAuth();

  const stateVideo  = (location.state as { video?: VideoData } | null)?.video;

  // ─── Core state ────────────────────────────────────────────────────────────
  const [videoData,    setVideoData]    = useState<VideoData | null>(stateVideo ?? null);
  const [fetchLoading, setFetchLoading] = useState(!stateVideo);
  const [fetchError,   setFetchError]   = useState<string | null>(null);

  const [scenes,       setScenes]       = useState<SceneData[]>(stateVideo?.scenes ?? []);
  const [transitions,  setTransitions]  = useState<SceneTransitionPreset[]>(
    (stateVideo?.scenes ?? []).map(() => 'auto')
  );
  const [subPreset,    setSubPreset]    = useState('classic');
  const [bgmPath,      setBgmPath]      = useState<string>(stateVideo?.options?.bgmPath ?? '');

  // Render lifecycle
  const [rendering,   setRendering]   = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(null);

  // Active scene + UI hover
  const [activeId,  setActiveId]  = useState(0);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  // Sidebar collapse state (left = scene list, right = quality)
  const [leftCollapsed,  setLeftCollapsed]  = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Voice picker per active scene (UI-only — does not yet round-trip to backend)
  const [voice, setVoice] = useState(VOICE_OPTIONS[0].id);

  // Regen / upload busy flags
  const [regenImg,     setRegenImg]     = useState<number | null>(null);
  const [regenAudio,   setRegenAudio]   = useState<number | null>(null);
  const [regenText,    setRegenText]    = useState<{ idx: number; what: string } | null>(null);
  const [uploadImg,    setUploadImg]    = useState<number | null>(null);
  const [uploadAudio,  setUploadAudio]  = useState<number | null>(null);
  const [uploadingBgm, setUploadingBgm] = useState(false);
  const [customBgmName, setCustomBgmName] = useState<string | null>(null);

  // Evaluation (lifted from QualityPane)
  const [evaluation, setEvaluation] = useState<VideoEvaluation | null>(null);
  const [evalTick,   setEvalTick]   = useState(0);   // bumped after re-render

  // Playback
  const [playing, setPlaying] = useState(false);
  const [cursor,  setCursor]  = useState(0);
  const rafRef    = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Toasts
  const { toasts, push: pushToast, dismiss } = useToasts();

  // ─── Load from API when no router state ────────────────────────────────────
  useEffect(() => {
    if (stateVideo || videoData || !videoId || !token) { setFetchLoading(false); return; }
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

  // ─── BGM preview audio (persisted ref) ─────────────────────────────────────
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const BGM_BASE_URL =
    typeof (import.meta as any).env !== 'undefined'
      ? ((import.meta as any).env.VITE_API_URL ?? '')
      : '';
  const playBgmPreview = useCallback((bgmId: string) => {
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
  }, [previewPlaying, BGM_BASE_URL]);
  useEffect(() => () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  }, []);

  // ─── Build SceneVM[] (memoised) ────────────────────────────────────────────
  const sceneVMs: SceneVM[] = useMemo(() => {
    return scenes.map((s, i) => {
      const ev = evaluation?.sceneScores?.find(x => x.sceneIndex === i);
      return toVM(s, i, transitions[i] ?? 'auto',
                  ev ? { score: ev.score, weakness: ev.weakness ?? null } : null);
    });
  }, [scenes, transitions, evaluation]);

  /** Cumulative start offset (sec) for each scene along the assembled video.
   *  Uses the *real* audioDuration (which is what the renderer concatenates),
   *  falling back to scene time-range duration only when audio is missing.   */
  const sceneStarts: number[] = useMemo(() => {
    const out: number[] = [];
    let acc = 0;
    for (const s of scenes) {
      out.push(acc);
      const d = (s as any).audioDuration as number | undefined;
      acc += (d && d > 0.05) ? d : 5;
    }
    return out;
  }, [scenes]);

  const totalDuration = useMemo(() => {
    let acc = 0;
    for (const s of scenes) {
      const d = (s as any).audioDuration as number | undefined;
      acc += (d && d > 0.05) ? d : 5;
    }
    return acc;
  }, [scenes]);

  // Clamp activeId to a valid range whenever the scenes array shrinks or grows.
  // (Defensive: handleRemoveScene already adjusts activeId, but rapid edits
  // can race; this guards against any out-of-bounds.)
  const safeActiveId = Math.min(
    Math.max(0, activeId),
    Math.max(0, sceneVMs.length - 1),
  );
  const activeScene = sceneVMs[safeActiveId] ?? null;
  const activeStart = sceneStarts[safeActiveId] ?? 0;

  // Whenever totalDuration shrinks below the cursor (e.g. after removing
  // scenes), pull the cursor back so it doesn't sit past the end forever.
  useEffect(() => {
    if (cursor > totalDuration) setCursor(Math.max(0, totalDuration));
  }, [totalDuration, cursor]);

  /** Choose the real video URL — prefer freshly re-rendered, else original. */
  const videoUrl: string | null =
    renderedUrl
    ?? (videoData as any)?.final_video_url
    ?? (videoData as any)?.videoUrl
    ?? null;

  /** When user clicks a sidebar scene → also push cursor to its start. */
  const handleSelectScene = useCallback((idx: number) => {
    setActiveId(idx);
    setCursor(sceneStarts[idx] ?? 0);
  }, [sceneStarts]);

  // ─── Playback loop ────────────────────────────────────────────────────────
  //   Skip when a real <video> exists — that element drives the cursor via
  //   onTimeUpdate, so running rAF AND timeupdate together caused the lag.
  useEffect(() => {
    if (!playing || videoUrl) {
      rafRef.current && cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTickRef.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setCursor(c => {
        const next = c + dt;
        if (next >= totalDuration) { setPlaying(false); return totalDuration; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { rafRef.current && cancelAnimationFrame(rafRef.current); };
  }, [playing, totalDuration, videoUrl]);

  // Auto-select scene under cursor — but only while the video is actually
  // playing (or the user is scrubbing the timeline). When the user clicks
  // a sidebar item, handleSelectScene already syncs activeId; running this
  // effect on top of that caused a race where rounding error in durationSec
  // could bump activeId by ±1 right after the click.
  useEffect(() => {
    if (!playing) return;
    if (!sceneStarts.length) return;
    // Find the last scene whose start <= cursor.
    let next = 0;
    for (let i = 0; i < sceneStarts.length; i++) {
      if (cursor + 1e-3 >= sceneStarts[i]) next = i;
      else break;
    }
    if (next !== activeId) setActiveId(next);
  }, [cursor, sceneStarts, playing, activeId]);

  const busy = rendering
    || regenImg !== null   || regenAudio !== null   || regenText !== null
    || uploadImg !== null  || uploadAudio !== null  || uploadingBgm;

  // ─── State helpers ─────────────────────────────────────────────────────────
  const updateScene = (idx: number, patch: Partial<SceneData>) =>
    setScenes(prev => { const n = [...prev]; n[idx] = { ...prev[idx], ...patch }; return n; });

  const setTrans = (idx: number, val: SceneTransitionPreset) =>
    setTransitions(prev => { const n = [...prev]; n[idx] = val; return n; });

  // ─── Scene list manipulation ──────────────────────────────────────────────
  const handleAddScene = useCallback(() => {
    setScenes(prev => {
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
    pushToast({ text: 'Added new scene', sev: 'ok' });
  }, [pushToast]);

  const handleRemoveScene = useCallback((idx: number) => {
    if (!confirm(`Scene ${idx + 1} устгах уу?`)) return;
    setScenes(prev => prev.filter((_, i) => i !== idx));
    setTransitions(prev => prev.filter((_, i) => i !== idx));
    // Use functional setter — `activeId` from closure could be stale if
    // remove is fired rapidly. Also clamp to new length-1 so we never
    // point past the array end (cause of the "blank editor" bug after
    // deleting the last scene).
    setActiveId(prev => {
      // If we removed a scene before the active one, shift active left.
      // If we removed the active scene itself, fall back to previous.
      // If we removed AFTER active, active is unchanged.
      let next = prev;
      if (idx < prev)       next = prev - 1;
      else if (idx === prev) next = Math.max(0, prev - 1);
      return Math.max(0, next);
    });
    pushToast({ text: `Removed scene ${idx + 1}`, sev: 'warn' });
  }, [pushToast]);

  const handleReorder = useCallback((from: number, to: number) => {
    if (from === to) return;
    setScenes(prev => {
      const c = [...prev]; const [m] = c.splice(from, 1); c.splice(to, 0, m); return c;
    });
    setTransitions(prev => {
      const c = [...prev]; const [m] = c.splice(from, 1); c.splice(to, 0, m); return c;
    });
    // Keep the active scene visually "active" after reorder.
    setActiveId(prev => {
      if (prev === from)                   return to;                 // moved active scene
      if (from < prev && to >= prev)       return prev - 1;           // active shifted left
      if (from > prev && to <= prev)       return prev + 1;           // active shifted right
      return prev;
    });
  }, []);

  // ─── AI regen handlers ────────────────────────────────────────────────────
  const handleRegenImage = useCallback(async () => {
    const idx = activeId;
    setRegenImg(idx);
    pushToast({ text: `Regenerating image — Scene ${idx + 1}…`, sev: 'info', ttl: 2400 });
    try {
      const s = scenes[idx];
      if (s.id) {
        const r = await reGenSceneImage(s.id, s.imagePrompt ?? '', token ?? undefined);
        updateScene(idx, { imageUrl: r.imageUrl });
      } else {
        const r = await regenerateScene(videoId!, idx,
          { regenerateWhat: 'image', imagePrompt: s.imagePrompt, narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined);
        const url = (r as any)?.imageUrl ?? r?.scenes?.[0]?.imageUrl;
        if (url) updateScene(idx, { imageUrl: url });
      }
      pushToast({ text: `Image ready — Scene ${idx + 1}`, sev: 'ok' });
    } catch (e: any) {
      pushToast({ text: `Image regen failed: ${e.message}`, sev: 'err' });
    } finally { setRegenImg(null); }
  }, [activeId, scenes, videoId, token, pushToast]);

  const handleRegenAudio = useCallback(async () => {
    const idx = activeId;
    setRegenAudio(idx);
    pushToast({ text: `Regenerating audio — Scene ${idx + 1}…`, sev: 'info', ttl: 2400 });
    try {
      const s = scenes[idx];
      if (s.id) {
        const r = await reGenSceneNarration(s.id, s.narration ?? '', token ?? undefined);
        updateScene(idx, { audioUrl: r.audioUrl, audioDuration: r.duration });
      } else {
        const r = await regenerateScene(videoId!, idx,
          { regenerateWhat: 'audio', narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined);
        const url = (r as any)?.audioUrl ?? r?.scenes?.[0]?.audioUrl;
        const dur = (r as any)?.audioDuration ?? r?.scenes?.[0]?.audioDuration;
        if (url) updateScene(idx, {
          audioUrl: url,
          ...(typeof dur === 'number' ? { audioDuration: dur } : {}),
        } as Partial<SceneData>);
      }
      pushToast({ text: `Audio ready — Scene ${idx + 1}`, sev: 'ok' });
    } catch (e: any) {
      pushToast({ text: `Audio regen failed: ${e.message}`, sev: 'err' });
    } finally { setRegenAudio(null); }
  }, [activeId, scenes, videoId, token, pushToast]);

  const handleRegenNarration = useCallback(async () => {
    const idx = activeId;
    setRegenText({ idx, what: 'narration' });
    try {
      const s = scenes[idx];
      const r = await regenSceneText(videoId!,
        { what: 'narration', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: videoData?.options?.genre },
        token ?? undefined);
      if (r.narration) {
        updateScene(idx, { narration: r.narration });
        pushToast({ text: 'Narration rewritten', sev: 'ok' });
      }
    } catch (e: any) {
      pushToast({ text: `Narration regen failed: ${e.message}`, sev: 'err' });
    } finally { setRegenText(null); }
  }, [activeId, scenes, videoId, videoData, token, pushToast]);

  const handleRegenImagePrompt = useCallback(async () => {
    const idx = activeId;
    setRegenText({ idx, what: 'imagePrompt' });
    try {
      const s = scenes[idx];
      const r = await regenSceneText(videoId!,
        { what: 'imagePrompt', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: videoData?.options?.genre },
        token ?? undefined);
      if (r.imagePrompt) {
        updateScene(idx, { imagePrompt: r.imagePrompt });
        pushToast({ text: 'Image prompt rewritten', sev: 'ok' });
      }
    } catch (e: any) {
      pushToast({ text: `Image prompt regen failed: ${e.message}`, sev: 'err' });
    } finally { setRegenText(null); }
  }, [activeId, scenes, videoId, videoData, token, pushToast]);

  // ─── Custom uploads ───────────────────────────────────────────────────────
  const handleUploadImage = useCallback(async (file: File) => {
    const idx = activeId;
    setUploadImg(idx);
    try {
      const sceneId = scenes[idx].id;
      const { url } = await uploadAsset('image', file, sceneId, token ?? undefined);
      updateScene(idx, { imageUrl: url });
      pushToast({ text: `Image uploaded — Scene ${idx + 1}`, sev: 'ok' });
    } catch (e: any) {
      pushToast({ text: `Image upload failed: ${e.message}`, sev: 'err' });
    } finally { setUploadImg(null); }
  }, [activeId, scenes, token, pushToast]);

  const handleUploadAudio = useCallback(async (file: File) => {
    const idx = activeId;
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
      updateScene(idx, { audioUrl: url, audioDuration: dur || (scenes[idx] as any).audioDuration });
      pushToast({ text: `Audio uploaded — Scene ${idx + 1}`, sev: 'ok' });
    } catch (e: any) {
      pushToast({ text: `Audio upload failed: ${e.message}`, sev: 'err' });
    } finally { setUploadAudio(null); }
  }, [activeId, scenes, token, pushToast]);

  const handleUploadBgm = useCallback(async (file: File) => {
    setUploadingBgm(true);
    try {
      const { url } = await uploadAsset('bgm', file, undefined, token ?? undefined);
      setBgmPath(url);
      setCustomBgmName(file.name);
      pushToast({ text: 'Custom BGM uploaded', sev: 'ok' });
    } catch (e: any) {
      pushToast({ text: `BGM upload failed: ${e.message}`, sev: 'err' });
    } finally { setUploadingBgm(false); }
  }, [token, pushToast]);

  // ─── Re-render ────────────────────────────────────────────────────────────
  const handleRerender = useCallback(async () => {
    setRendering(true);
    setRenderError(null);
    pushToast({ text: 'Re-rendering video…', sev: 'info', ttl: 3200 });
    try {
      const preset = SUB_PRESETS.find(p => p.id === subPreset);
      const result = await reAssembleVideo(videoId!,
        {
          scenes,
          title:            videoData?.title,
          sceneTransitions: transitions,
          subtitleStyle:    preset?.disabled ? undefined : preset?.style,
          disableSubtitles: preset?.disabled ?? false,
          genre:            videoData?.options?.genre,
          bgmPath:          bgmPath || undefined,
        },
        token ?? undefined);
      setRenderedUrl(result.videoUrl);
      pushToast({ text: 'Re-render complete', sev: 'ok' });
      // Trigger a fresh evaluation pull (overall score may change)
      setEvalTick(t => t + 1);
    } catch (e: any) {
      setRenderError(e.message ?? 'Re-render failed');
      pushToast({ text: `Re-render failed: ${e.message ?? 'unknown'}`, sev: 'err' });
    } finally { setRendering(false); }
  }, [videoId, scenes, transitions, subPreset, bgmPath, videoData, token, pushToast]);

  // ─── Fetch / error ────────────────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className={styles.shell}>
        <div className={styles.shellLoading}>
          <span className={styles.spinner}/>
          <p>Loading video…</p>
        </div>
      </div>
    );
  }
  if (fetchError || !videoData) {
    return (
      <div className={styles.shell}>
        <div className={styles.shellLoading}>
          <p>{fetchError ?? 'Video not found.'}</p>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        </div>
      </div>
    );
  }

  // ─── Derived bits for the active scene ────────────────────────────────────
  const activeSubPreset = SUB_PRESETS.find(p => p.id === subPreset);
  const subStyle = subtitleInlineStyle(activeSubPreset);

  const status: VideoStatus = rendering ? 'rendering' :
    (((videoData as any).status as VideoStatus) ?? 'draft');

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>
      <TopBar
        title={videoData.title ?? videoData.topic ?? 'Untitled'}
        subtitle={`Project · ${videoData.topic ?? '—'} · ${scenes.length} scenes · ${totalDuration.toFixed(1)}s`}
        status={status}
        saving={false}
        rendering={rendering}
        onBack={() => navigate(-1)}
        onSave={() => pushToast({ text: 'Saved (changes auto-sync)', sev: 'info' })}
        onExport={handleRerender}
      />

      <main className={[
        styles.layout,
        leftCollapsed  && styles.leftCollapsed,
        rightCollapsed && styles.rightCollapsed,
        leftCollapsed && rightCollapsed && styles.bothCollapsed,
      ].filter(Boolean).join(' ')}>
        {leftCollapsed
          ? (
            <div className={styles.collapseRail}>
              <button className={styles.collapseBtn} onClick={() => setLeftCollapsed(false)} title="Show scenes">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
              <span className={styles.railLabel}>SCENES · {scenes.length}</span>
            </div>
          )
          : (
            <div style={{ position: 'relative', display: 'contents' }}>
              <SceneSidebar
                scenes={sceneVMs}
                activeId={activeId}
                hoveredId={hoveredId}
                onSelect={handleSelectScene}
                onHover={setHoveredId}
                onAdd={handleAddScene}
                onRemove={handleRemoveScene}
                onReorder={handleReorder}
              />
            </div>
          )}

        <section className={styles.center} style={{ position: 'relative' }}>
          {/* Edge toggles — float over the center column */}
          {!leftCollapsed && (
            <button className={`${styles.edgeToggle} ${styles.edgeToggleRight}`}
                    style={{ left: -11 }}
                    onClick={() => setLeftCollapsed(true)}
                    title="Hide scenes">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
          )}
          {!rightCollapsed && (
            <button className={`${styles.edgeToggle} ${styles.edgeToggleLeft}`}
                    style={{ right: -11 }}
                    onClick={() => setRightCollapsed(true)}
                    title="Hide quality">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          )}

          {/* ── HERO: big video preview ── */}
          <section className={styles.heroSection}>
            <PreviewStage
              scene={activeScene}
              videoUrl={videoUrl}
              sceneStart={activeStart}
              cursor={cursor}
              total={totalDuration}
              playing={playing}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onSeek={setCursor}
              regenImage={regenImg === activeId}
              regenAudio={regenAudio === activeId}
              subtitlePreview={activeScene?.raw.narration ?? ''}
              subtitleStyle={subStyle}
            />
          </section>

          {/* ── Timeline strip ── */}
          <section className={styles.timelineSection}>
            <Timeline
              scenes={sceneVMs}
              cursor={cursor}
              total={totalDuration}
              activeId={activeId}
              hoveredId={hoveredId}
              playing={playing}
              sceneStarts={sceneStarts}
              onSeek={setCursor}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onSelect={handleSelectScene}
              onHover={setHoveredId}
            />
          </section>

          {/* ── Edit panel (scroll down to use) ── */}
          {activeScene && (
            <section className={styles.editorSection}>
              <div className={styles.editorBanner}>
                <span className={styles.editorRole}>{activeScene.role.toUpperCase()}</span>
                <h2 className={styles.editorTitle}>{activeScene.title}</h2>
                <span className={styles.editorMeta}>
                  Scene {activeScene.index + 1} · {activeScene.durationSec.toFixed(1)}s
                </span>
              </div>
              <EditForm
                scene={activeScene.raw}
                sceneIndex={activeScene.index}
                sceneRole={activeScene.role}
                onChangeNarration={(v) => updateScene(activeScene.index, { narration: v })}
                onChangeImagePrompt={(v) => updateScene(activeScene.index, { imagePrompt: v })}
                onRegenNarration={handleRegenNarration}
                onRegenImagePrompt={handleRegenImagePrompt}
                onRegenImage={handleRegenImage}
                onRegenAudio={handleRegenAudio}
                onUploadImage={handleUploadImage}
                onUploadAudio={handleUploadAudio}
                busy={{
                  img:    regenImg === activeScene.index   || uploadImg === activeScene.index,
                  audio:  regenAudio === activeScene.index || uploadAudio === activeScene.index,
                  narr:   regenText?.idx === activeScene.index && regenText.what === 'narration',
                  prompt: regenText?.idx === activeScene.index && regenText.what === 'imagePrompt',
                }}
                voiceOptions={VOICE_OPTIONS}
                voice={voice}
                onChangeVoice={setVoice}
                transitionOptions={TRANS_OPTIONS}
                transition={transitions[activeScene.index] ?? 'auto'}
                onChangeTransition={(t) => setTrans(activeScene.index, t)}
                subPresets={SUB_PRESETS}
                subPresetId={subPreset}
                onChangeSubPreset={setSubPreset}
                bgmOptions={BGM_OPTIONS}
                bgmPath={bgmPath}
                customBgmName={customBgmName}
                uploadingBgm={uploadingBgm}
                previewPlayingId={previewPlaying}
                onChangeBgm={(id) => { setBgmPath(id); setCustomBgmName(null); }}
                onPreviewBgm={playBgmPreview}
                onUploadBgm={handleUploadBgm}
                rendering={rendering}
              />
            </section>
          )}
        </section>

        {rightCollapsed
          ? (
            <div className={`${styles.collapseRail} ${styles.right}`}>
              <button className={styles.collapseBtn} onClick={() => setRightCollapsed(false)} title="Show quality">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <span className={styles.railLabel}>QUALITY</span>
            </div>
          )
          : videoId && (
            <QualityPane
              videoId={videoId}
              token={token ?? undefined}
              onEvaluation={setEvaluation}
              onSceneHover={setHoveredId}
              refreshTick={evalTick}
              onJumpToScene={handleSelectScene}
            />
          )}
      </main>

      {/* Render-success ribbon */}
      {renderedUrl && (
        <div className={styles.successBar}>
          <span>Re-rendered successfully</span>
          <a href={renderedUrl} target="_blank" rel="noreferrer">Watch →</a>
          <a href={renderedUrl} download>Download ↓</a>
        </div>
      )}
      {renderError && <div className={styles.errBar}>{renderError}</div>}

      <Toasts toasts={toasts} onDismiss={dismiss}/>
    </div>
  );
}
