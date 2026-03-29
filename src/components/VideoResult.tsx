import { useState } from 'react';
import type { VideoData } from '@integration/types';
import { VideoStudio } from './VideoStudio';
import styles from './VideoResult.module.css';

interface Props {
  video: VideoData;
  onReset: () => void;
}

export function VideoResult({ video, onReset }: Props) {
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.status}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>Video Ready</span>
        </div>
        <button className={styles.newBtn} onClick={onReset}>
          + New Video
        </button>
      </div>

      {/* Video player */}
      {videoUrl && (
        <div className={styles.playerWrap}>
          <video
            key={videoUrl}
            className={styles.player}
            src={videoUrl}
            controls
            playsInline
            poster={video.scenes[0]?.imageUrl}
          />
          <div className={styles.playerGlow} />
        </div>
      )}

      {/* Meta */}
      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Topic</span>
          <span className={styles.metaValue}>{video.topic}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Genre</span>
          <span className={styles.metaValue}>{video.options?.genre ?? '—'}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Scenes</span>
          <span className={styles.metaValue}>{video.scenes?.length ?? 0}</span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Language</span>
          <span className={styles.metaValue}>{video.options?.language ?? '—'}</span>
        </div>
      </div>

      {/* Download */}
      {videoUrl && (
        <a
          href={videoUrl}
          download
          className={styles.downloadBtn}
        >
          ↓ Download Video
        </a>
      )}

      {/* Studio editor */}
      <VideoStudio
        video={video}
        onVideoUpdated={(newUrl) => {
          // Add cache-bust so the browser reloads the updated file
          setVideoUrl(`${newUrl}?t=${Date.now()}`);
        }}
      />
    </div>
  );
}
