import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SceneData, VideoData } from '@integration/types';
import { regenSceneText, regenerateScene, reGenSceneImage, reGenSceneNarration } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import styles from './ScriptView.module.css';

interface Props {
  video: VideoData;
  onScenesChange?: (scenes: SceneData[]) => void;
}

export function ScriptView({ video, onScenesChange }: Props) {
  const navigate    = useNavigate();
  const { token }   = useAuth();
  const [scenes, setScenes] = useState<SceneData[]>(video.scenes);
  const [regenIdx, setRegenIdx]     = useState<number | null>(null);
  const [regenWhat, setRegenWhat]   = useState<string | null>(null);
  const [imgRegenIdx, setImgRegenIdx] = useState<number | null>(null);
  const [audioRegenIdx, setAudioRegenIdx] = useState<number | null>(null);

  const updateScene = (idx: number, patch: Partial<SceneData>) => {
    setScenes(prev => {
      const next = [...prev];
      next[idx] = { ...prev[idx], ...patch };
      onScenesChange?.(next);
      return next;
    });
  };

  // ── AI regen narration ──────────────────────────────────────────────────────
  const handleRegenNarration = useCallback(async (idx: number) => {
    setRegenIdx(idx); setRegenWhat('narration');
    try {
      const s = scenes[idx];
      const result = await regenSceneText(
        video.videoId,
        { what: 'narration', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: video.options?.genre },
        token ?? undefined,
      );
      if (result.narration) updateScene(idx, { narration: result.narration });
    } catch (e: any) {
      alert(`Narration regen failed: ${e.message}`);
    } finally {
      setRegenIdx(null); setRegenWhat(null);
    }
  }, [scenes, video, token]);

  // ── AI regen imagePrompt ────────────────────────────────────────────────────
  const handleRegenImagePrompt = useCallback(async (idx: number) => {
    setRegenIdx(idx); setRegenWhat('imagePrompt');
    try {
      const s = scenes[idx];
      const result = await regenSceneText(
        video.videoId,
        { what: 'imagePrompt', scene: s.scene, time: s.time, narration: s.narration, imagePrompt: s.imagePrompt, genre: video.options?.genre },
        token ?? undefined,
      );
      if (result.imagePrompt) updateScene(idx, { imagePrompt: result.imagePrompt });
    } catch (e: any) {
      alert(`Image prompt regen failed: ${e.message}`);
    } finally {
      setRegenIdx(null); setRegenWhat(null);
    }
  }, [scenes, video, token]);

  // ── Regen scene image ───────────────────────────────────────────────────────
  const handleRegenImage = useCallback(async (idx: number) => {
    setImgRegenIdx(idx);
    try {
      const s = scenes[idx];
      if (s.id) {
        // Шинэ endpoint — DB scene id ашиглана
        const result = await reGenSceneImage(s.id, s.imagePrompt ?? '', token ?? undefined);
        updateScene(idx, { imageUrl: result.imageUrl });
      } else {
        // Fallback — videoId + sceneIndex
        const result = await regenerateScene(
          video.videoId, idx,
          { regenerateWhat: 'image', imagePrompt: s.imagePrompt, narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined,
        );
        const newUrl = (result as any)?.imageUrl ?? result?.scenes?.[0]?.imageUrl;
        if (newUrl) updateScene(idx, { imageUrl: newUrl });
      }
    } catch (e: any) {
      alert(`Image regen failed: ${e.message}`);
    } finally {
      setImgRegenIdx(null);
    }
  }, [scenes, video.videoId, token]);

  // ── Regen scene audio ───────────────────────────────────────────────────────
  const handleRegenAudio = useCallback(async (idx: number) => {
    setAudioRegenIdx(idx);
    try {
      const s = scenes[idx];
      if (s.id) {
        // Шинэ endpoint — scene-д хадгалагдсан ttsProvider-ийг backend-д ашиглана
        const result = await reGenSceneNarration(s.id, s.narration ?? '', token ?? undefined);
        updateScene(idx, { audioUrl: result.audioUrl, audioDuration: result.duration });
      } else {
        // Fallback
        const result = await regenerateScene(
          video.videoId, idx,
          { regenerateWhat: 'audio', narration: s.narration, time: s.time, scene: s.scene },
          token ?? undefined,
        );
        const newUrl = (result as any)?.audioUrl ?? result?.scenes?.[0]?.audioUrl;
        if (newUrl) updateScene(idx, { audioUrl: newUrl });
      }
    } catch (e: any) {
      alert(`Audio regen failed: ${e.message}`);
    } finally {
      setAudioRegenIdx(null);
    }
  }, [scenes, video.videoId, token]);

  const busy = regenIdx !== null || imgRegenIdx !== null || audioRegenIdx !== null;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <span>📝</span>
          Script — {scenes.length} scenes
        </h2>
        <button
          className={styles.editStudioBtn}
          onClick={() => navigate(`/studio/${video.videoId}`, { state: { video: { ...video, scenes } } })}
        >
          ✏️ Edit Studio →
        </button>
      </div>

      <div className={styles.sceneList}>
        {scenes.map((scene, idx) => {
          const isRegenNarr  = regenIdx === idx && regenWhat === 'narration';
          const isRegenPrmpt = regenIdx === idx && regenWhat === 'imagePrompt';
          const isRegenImg   = imgRegenIdx === idx;
          const isRegenAudio = audioRegenIdx === idx;

          return (
            <div key={idx} className={styles.card}>
              {/* Card header */}
              <div className={styles.cardTop}>
                <div className={styles.cardMeta}>
                  <span className={styles.sceneNum}>#{idx + 1}</span>
                  <span className={styles.sceneTime}>{scene.time}</span>
                  <span className={styles.sceneTitle}>{scene.scene}</span>
                </div>
                {/* Per-scene image regen + audio regen */}
                <div className={styles.mediaActions}>
                  <button
                    className={`${styles.iconBtn} ${isRegenImg ? styles.busy : ''}`}
                    onClick={() => handleRegenImage(idx)}
                    disabled={busy}
                    title="Regenerate image"
                  >
                    {isRegenImg ? '⟳' : '🖼️'}
                  </button>
                  <button
                    className={`${styles.iconBtn} ${isRegenAudio ? styles.busy : ''}`}
                    onClick={() => handleRegenAudio(idx)}
                    disabled={busy}
                    title="Regenerate audio"
                  >
                    {isRegenAudio ? '⟳' : '🎙️'}
                  </button>
                </div>
              </div>

              <div className={styles.cardBody}>
                {/* Thumbnail */}
                {scene.imageUrl && (
                  <img src={scene.imageUrl} className={styles.thumb} alt={`Scene ${idx + 1}`} loading="lazy" />
                )}

                {/* Narration */}
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>
                    Narration
                    <button
                      className={`${styles.regenTextBtn} ${isRegenNarr ? styles.busy : ''}`}
                      onClick={() => handleRegenNarration(idx)}
                      disabled={busy}
                      title="AI rewrite narration"
                    >
                      {isRegenNarr ? '⟳ Rewriting…' : '🤖 Regen'}
                    </button>
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={scene.narration ?? ''}
                    rows={3}
                    onChange={e => updateScene(idx, { narration: e.target.value })}
                    disabled={busy}
                    placeholder="Narration text…"
                  />
                </div>

                {/* Image prompt */}
                <div className={styles.fieldGroup}>
                  <div className={styles.fieldLabel}>
                    Image Prompt
                    <button
                      className={`${styles.regenTextBtn} ${isRegenPrmpt ? styles.busy : ''}`}
                      onClick={() => handleRegenImagePrompt(idx)}
                      disabled={busy}
                      title="AI rewrite image prompt"
                    >
                      {isRegenPrmpt ? '⟳ Rewriting…' : '🤖 Regen'}
                    </button>
                  </div>
                  <textarea
                    className={styles.textarea}
                    value={scene.imagePrompt ?? ''}
                    rows={2}
                    onChange={e => updateScene(idx, { imagePrompt: e.target.value })}
                    disabled={busy}
                    placeholder="Image prompt…"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
