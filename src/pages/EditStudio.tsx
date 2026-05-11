import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { VideoData, SceneData, SceneTransitionPreset, SubtitleStyleOptions } from '@integration/types';
import { reAssembleVideo, regenSceneText, regenerateScene, reGenSceneImage, reGenSceneNarration, getVideoStatus, uploadAsset } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import { QualityReport } from '../components/QualityReport';
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

  // Which scene the QualityReport is currently highlighting (for ring effect)
  const [highlightScene, setHighlightScene] = useState<number | null>(null);

  const busy = rendering
    || regenImg !== null   || regenAudio !== null   || regenText !== null
    || uploadImg !== null  || uploadAudio !== null  || uploadingBgm;

  // ── Scene state helpers ────────────────────────────────────────────────────
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
                onClick={() => { setBgmPath(b.id); setCustomBgmName(null); }}
                disabled={busy}
              >{b.label}</button>
            ))}

            {/* Custom BGM upload */}
            <label className={`${styles.ctrlBtn} ${customBgmName ? styles.ctrlActive : ''} ${uploadingBgm ? styles.ctrlBtnBusy : ''}`}
                   style={{ cursor: busy ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                   title="Upload your own BGM (.mp3, .wav)">
              {uploadingBgm
                ? <>… Uploading</>
                : customBgmName
                  ? <><Icon.Music /> {customBgmName.length > 14 ? customBgmName.slice(0, 12) + '…' : customBgmName}</>
                  : <><Icon.Plus /> Custom BGM</>}
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

          return (
            <div key={idx}
                 className={`${styles.sceneCard} ${isHighlighted ? styles.sceneHighlighted : ''}`}>
              {/* ── Scene header ── */}
              <div className={styles.sceneHeader}>
                <div className={styles.sceneHeaderLeft}>
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
                </div>
              </div>

              {/* ── Scene body ── */}
              <div className={styles.sceneBody}>
                {/* Left: image */}
                <div className={styles.sceneLeft}>
                  {scene.imageUrl
                    ? <img src={scene.imageUrl} className={styles.sceneThumb} alt="" loading="lazy" />
                    : <div className={styles.sceneThumbEmpty}><Icon.Image /></div>
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
