import { useState } from 'react';
import { GeneratorForm } from '../components/GeneratorForm';
import { ProgressTracker } from '../components/ProgressTracker';
import { SceneGallery } from '../components/SceneGallery';
import { VideoResult } from '../components/VideoResult';
import { ScriptView } from '../components/ScriptView';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import type { SceneData } from '@integration/types';
import styles from './Studio.module.css';

export function Studio() {
  const { step, video, error, isLoading, generate, reset } = useVideoGeneration();
  const [scenes, setScenes]       = useState<SceneData[]>([]);
  const [rightTab, setRightTab]   = useState<'gallery' | 'script'>('gallery');

  // Sync scenes from video data when generation completes
  const currentScenes = video?.scenes ?? scenes;

  return (
    <div className={styles.page}>
      {/* ── Background atmosphere ── */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.layout}>

        {/* ── Left panel — form / result ── */}
        <aside className={styles.panel}>
          <div className={styles.panelCard}>
            {/* Logo/title */}
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <span className={styles.titleIcon}>▶</span>
                <div>
                  <h1 className={styles.title}>AI Video Studio</h1>
                  <p className={styles.subtitle}>Generate cinematic short-form videos</p>
                </div>
              </div>
            </div>

            {step === 'complete' && video ? (
              <VideoResult video={video} onReset={reset} />
            ) : (
              <GeneratorForm onSubmit={generate} isLoading={isLoading} />
            )}
          </div>
        </aside>

        {/* ── Right panel — progress + scenes ── */}
        <main className={styles.main}>
          {step === 'idle' ? (
            <IdleState />
          ) : step === 'error' ? (
            <div className={styles.mainCard}>
              <ProgressTracker step={step} error={error} />
            </div>
          ) : step === 'complete' && currentScenes.length > 0 ? (
            <div className={styles.mainCard}>
              {/* Tab bar */}
              <div className={styles.tabBar}>
                <button
                  className={`${styles.tab} ${rightTab === 'gallery' ? styles.tabActive : ''}`}
                  onClick={() => setRightTab('gallery')}
                >🎞️ Scenes</button>
                <button
                  className={`${styles.tab} ${rightTab === 'script' ? styles.tabActive : ''}`}
                  onClick={() => setRightTab('script')}
                >📝 Script</button>
              </div>

              {rightTab === 'gallery' ? (
                <SceneGallery
                  scenes={currentScenes}
                  videoId={video!.videoId}
                  onSceneUpdate={setScenes}
                />
              ) : (
                <ScriptView
                  video={video!}
                  onScenesChange={setScenes}
                />
              )}
            </div>
          ) : (
            <div className={styles.mainCard}>
              <ProgressTracker step={step} error={error} />
              {/* Teaser skeleton while generating */}
              <div className={styles.skeletonGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className={styles.idle}>
      <div className={styles.idleIcon}>🎬</div>
      <h2 className={styles.idleTitle}>Ready to create</h2>
      <p className={styles.idleText}>
        Fill in a topic on the left and hit <strong>Generate Video</strong>.<br />
        Your scenes will appear here.
      </p>
      <div className={styles.idleFeatures}>
        {[
          { icon: '✍️', label: 'AI Script Writer' },
          { icon: '🎨', label: 'Scene Illustrator' },
          { icon: '🎙️', label: 'Voice Synthesis' },
          { icon: '🎞️', label: 'Cinematic Renderer' },
        ].map(f => (
          <div key={f.label} className={styles.idleFeature}>
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
