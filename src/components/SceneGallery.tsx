import { useState } from 'react';
import type { SceneData } from '@integration/types';
import { regenerateScene } from '@integration/videoApi';
import { useAuth } from '../context/AuthContext';
import styles from './SceneGallery.module.css';

interface Props {
  scenes: SceneData[];
  videoId: string;
  onSceneUpdate?: (scenes: SceneData[]) => void;
}

// Per-scene editable fields
interface SceneEdit {
  imagePrompt: string;
  narration:   string;
}

export function SceneGallery({ scenes, videoId, onSceneUpdate }: Props) {
  const { token } = useAuth();

  const [selected,     setSelected]     = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [regenError,   setRegenError]   = useState<string | null>(null);

  // Local edits keyed by scene index — populated when a card is first opened
  const [edits, setEdits] = useState<Record<number, SceneEdit>>({});

  // Open/close a card and seed edit state from the scene data
  const toggleCard = (idx: number) => {
    if (selected === idx) {
      setSelected(null);
    } else {
      setSelected(idx);
      setEdits(prev => ({
        ...prev,
        [idx]: prev[idx] ?? {
          imagePrompt: scenes[idx]?.imagePrompt ?? '',
          narration:   scenes[idx]?.narration   ?? '',
        },
      }));
    }
  };

  const setEditField = (idx: number, field: keyof SceneEdit, value: string) => {
    setEdits(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? { imagePrompt: '', narration: '' }), [field]: value },
    }));
  };

  const handleRegenerate = async (
    sceneIndex: number,
    what: 'audio' | 'image' | 'both',
  ) => {
    setRegenerating(sceneIndex);
    setRegenError(null);

    const edit = edits[sceneIndex];
    const scene = scenes[sceneIndex];

    try {
      const updated = await regenerateScene(
        videoId,
        sceneIndex,
        {
          regenerateWhat: what,
          imagePrompt: edit?.imagePrompt || scene?.imagePrompt,
          narration:   edit?.narration   || scene?.narration,
          time:        scene?.time,
          scene:       scene?.scene,
        },
        token ?? undefined,   // ← JWT token header-т орно
      );
      onSceneUpdate?.(updated.scenes);
    } catch (err: any) {
      setRegenError(err.message);
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.heading}>
        <span className={styles.headingIcon}>🎞️</span>
        Scenes — {scenes.length} clips
      </h2>

      <div className={styles.grid}>
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className={`${styles.card} ${selected === idx ? styles.cardOpen : ''}`}
            onClick={() => toggleCard(idx)}
          >
            {/* Thumbnail */}
            <div className={styles.thumb}>
              {scene.imageUrl ? (
                <img src={scene.imageUrl} alt={`Scene ${idx + 1}`} loading="lazy" />
              ) : (
                <div className={styles.thumbPlaceholder}>
                  <span>🎨</span>
                </div>
              )}
              <span className={styles.sceneNum}>{String(idx + 1).padStart(2, '0')}</span>
              <span className={styles.sceneTime}>{scene.time}</span>
              {scene.audioDuration > 0 && (
                <span className={styles.duration}>{scene.audioDuration.toFixed(1)}s</span>
              )}
            </div>

            {/* Expanded details */}
            {selected === idx && (
              <div className={styles.details} onClick={e => e.stopPropagation()}>
                <p className={styles.sceneTitle}>{scene.scene}</p>
                <p className={styles.sceneDesc}>{scene.description}</p>

                {/* Audio player */}
                {scene.audioUrl && (
                  <audio
                    className={styles.audio}
                    controls
                    src={scene.audioUrl}
                    preload="none"
                  />
                )}

                {/* ── Editable fields ── */}
                <div className={styles.editSection}>
                  <label className={styles.editLabel}>🖼 Image Prompt</label>
                  <textarea
                    className={styles.editTextarea}
                    rows={3}
                    value={edits[idx]?.imagePrompt ?? ''}
                    onChange={e => setEditField(idx, 'imagePrompt', e.target.value)}
                    disabled={regenerating !== null}
                    placeholder="Describe the visual you want to generate…"
                  />

                  <label className={styles.editLabel}>🎙 Narration</label>
                  <textarea
                    className={styles.editTextarea}
                    rows={3}
                    value={edits[idx]?.narration ?? ''}
                    onChange={e => setEditField(idx, 'narration', e.target.value)}
                    disabled={regenerating !== null}
                    placeholder="Narration text for this scene…"
                  />
                </div>

                {/* ── Regenerate buttons ── */}
                <div className={styles.regenRow}>
                  {(['image', 'audio', 'both'] as const).map(what => (
                    <button
                      key={what}
                      className={styles.regenBtn}
                      disabled={regenerating !== null}
                      onClick={() => handleRegenerate(idx, what)}
                    >
                      {regenerating === idx ? '⏳' : '↺'} {what}
                    </button>
                  ))}
                </div>

                {regenError && <p className={styles.regenError}>{regenError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
