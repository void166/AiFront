import { useState } from 'react';
import { GeneratorForm }   from '../components/GeneratorForm';
import { ProgressTracker } from '../components/ProgressTracker';
import { SceneGallery }    from '../components/SceneGallery';
import { VideoResult }     from '../components/VideoResult';
import { ScriptView }      from '../components/ScriptView';
import { VideoLibrary }    from '../components/VideoLibrary';
import { useVideoGeneration } from '../hooks/useVideoGeneration';
import { useUserVideos }      from '../hooks/useUserVideos';
import type { SceneData } from '@integration/types';
import styles from './Studio.module.css';

type LeftTab = 'generate' | 'library';

export function Studio() {
  const { step, video, error, isLoading, generate, reset } = useVideoGeneration();
  const { videos, loading: libLoading, error: libError, refresh, remove } = useUserVideos();

  const [scenes,   setScenes]   = useState<SceneData[]>([]);
  const [rightTab, setRightTab] = useState<'gallery' | 'script'>('gallery');
  const [leftTab,  setLeftTab]  = useState<LeftTab>('generate');

  const currentScenes = video?.scenes ?? scenes;

  // After generation completes, switch to generate tab and refresh library
  const handleGenerate = async (payload: any) => {
    setLeftTab('generate');
    await generate(payload);
    refresh(); // pick up the newly saved video
  };

  return (
    <div className={styles.page}>
      {/* ── Background atmosphere ── */}
      <div className={styles.bg} aria-hidden="true">
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
        <div className={styles.bgGrid} />
      </div>

      <div className={styles.layout}>

        {/* ══════════════════════════════════════════
            LEFT PANEL — Generate / Library tabs
        ══════════════════════════════════════════ */}
        <aside className={styles.panel}>
          <div className={styles.panelCard}>

            {/* ── Logo header ── */}
            <div className={styles.panelHeader}>
              <div className={styles.panelTitle}>
                <div className={styles.titleIconWrap}>
                  <span className={styles.titleIcon}>▶</span>
                </div>
                <div>
                  <h1 className={styles.title}>AI Video Studio</h1>
                  <p className={styles.subtitle}>Generate cinematic short-form videos</p>
                </div>
              </div>

              {/* Left panel tab bar */}
              <div className={styles.leftTabBar}>
                <button
                  className={`${styles.leftTab} ${leftTab === 'generate' ? styles.leftTabActive : ''}`}
                  onClick={() => setLeftTab('generate')}
                >
                  🎬 Generate
                </button>
                <button
                  className={`${styles.leftTab} ${leftTab === 'library' ? styles.leftTabActive : ''}`}
                  onClick={() => setLeftTab('library')}
                >
                  📁 My Videos
                  {videos.length > 0 && (
                    <span className={styles.leftTabBadge}>{videos.length}</span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Left panel content ── */}
            {leftTab === 'generate' ? (
              step === 'complete' && video ? (
                <VideoResult video={video} onReset={reset} />
              ) : (
                <GeneratorForm onSubmit={handleGenerate} isLoading={isLoading} />
              )
            ) : (
              /* ── My Videos (compact list) ── */
              <div className={styles.libPanel}>
                <p className={styles.libPanelHint}>
                  Hover a card on the right to <strong>view</strong> or <strong>edit</strong>.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ══════════════════════════════════════════
            RIGHT PANEL — Progress / Scenes / Library
        ══════════════════════════════════════════ */}
        <main className={styles.main}>

          {/* Library tab selected → show full library */}
          {leftTab === 'library' ? (
            <div className={styles.mainCard}>
              <VideoLibrary
                videos={videos}
                loading={libLoading}
                error={libError}
                onRefresh={refresh}
                onDelete={remove}
              />
            </div>

          /* Generate tab — normal pipeline states */
          ) : step === 'idle' ? (
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

          ) : step === 'error' ? (
            <div className={styles.mainCard}>
              <ProgressTracker step={step} error={error} />
            </div>

          ) : step === 'complete' && currentScenes.length > 0 ? (
            <div className={styles.mainCard}>
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
