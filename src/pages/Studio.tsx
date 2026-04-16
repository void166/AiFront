import { useState } from 'react';
import { ChatInterface }   from '../components/ChatInterface';
import { ProgressTracker } from '../components/ProgressTracker';
import { SceneGallery }    from '../components/SceneGallery';
import { VideoResult }     from '../components/VideoResult';
import { ScriptView }      from '../components/ScriptView';
import { VideoLibrary }    from '../components/VideoLibrary';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useUserVideos }      from '../hooks/useUserVideos';
import type { SceneData } from '@integration/types';
import styles from './Studio.module.css';

export function Studio() {
  const { step, video, error, isLoading, generate, reset } = useVideoGeneration();
  const { videos, loading: libLoading, error: libError, refresh, remove } = useUserVideos();

  const [scenes,   setScenes]   = useState<SceneData[]>([]);
  const [rightTab, setRightTab] = useState<'gallery' | 'script'>('gallery');

  const currentScenes = video?.scenes ?? scenes;
  const isDone = step === 'complete' && !!video;

  const handleGenerate = async (payload: any) => {
    await generate(payload);
    refresh();
  };

  const handleReset = () => {
    reset();
    setScenes([]);
    setRightTab('gallery');
  };

  return (
    <div className={styles.page}>
      {/* ── Background blobs ── */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.layout}>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — AI Chat Interface (order:2)
        ══════════════════════════════════════════ */}
        <aside className={styles.panel}>
          {/* Logo header */}
          <div className={styles.panelHeader}>
            <div className={styles.panelTitle}>
              <div className={styles.titleIconWrap}>
                <span className={styles.titleIcon}>⚡</span>
              </div>
              <div>
                <h1 className={styles.title}>ViralAI Studio</h1>
                <p className={styles.subtitle}>Chat with AI to build your video</p>
              </div>
            </div>
          </div>

          {/* Chat fills remaining height */}
          <div className={styles.chatWrap}>
            <ChatInterface
              onSubmit={handleGenerate}
              isLoading={isLoading}
              isDone={isDone}
              onReset={handleReset}
            />
          </div>
        </aside>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — Progress / Result / Library
        ══════════════════════════════════════════ */}
        <main className={styles.main}>

          {/* Generating → progress + skeleton */}
          {step !== 'idle' && step !== 'complete' && step !== 'error' ? (
            <div className={styles.mainCard}>
              <ProgressTracker step={step} error={error} />
              <div className={styles.skeletonGrid}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.skeletonCard} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            </div>

          /* Error */
          ) : step === 'error' ? (
            <div className={styles.mainCard}>
              <ProgressTracker step={step} error={error} />
            </div>

          /* Complete — show result + scene tabs */
          ) : step === 'complete' && currentScenes.length > 0 ? (
            <div className={styles.mainCard}>
              {video?.videoUrl && (
                <VideoResult video={video} onReset={handleReset} />
              )}
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

          /* Idle — library or welcome */
          ) : (
            <div className={styles.mainCard}>
              {videos.length > 0 ? (
                <VideoLibrary
                  videos={videos}
                  loading={libLoading}
                  error={libError}
                  onRefresh={refresh}
                  onDelete={remove}
                />
              ) : (
                <IdleState />
              )}
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
        Chat with AI on the left to build your video.<br />
        Scenes will appear here live.
      </p>
      <div className={styles.idleFeatures}>
        {[
          { icon: '✍️', label: 'AI Script Writer' },
          { icon: '🎨', label: 'Scene Illustrator' },
          { icon: '🎙️', label: 'Voice Synthesis' },
          { icon: '🎞️', label: 'Cinematic Render' },
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
