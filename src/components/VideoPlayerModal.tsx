import { useEffect } from 'react';
import styles from './VideoPlayerModal.module.css';

interface Props {
  videoUrl: string;
  title: string;
  onClose: () => void;
}

export function VideoPlayerModal({ videoUrl, title, onClose }: Props) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.playerWrap}>
          <video
            className={styles.video}
            src={videoUrl}
            controls
            autoPlay
            playsInline
          />
        </div>
        <a href={videoUrl} download className={styles.downloadBtn}>
          ↓ Download
        </a>
      </div>
    </div>
  );
}
