import type { Toast } from './types';
import styles from './Toasts.module.css';

export function Toasts({ toasts, onDismiss }: {
  toasts:    Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className={styles.stack}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[`sev_${t.sev}`]}`}
             role="status"
             onClick={() => onDismiss(t.id)}>
          <span className={styles.text}>{t.text}</span>
          <button className={styles.close} aria-label="Dismiss"
                  onClick={(e) => { e.stopPropagation(); onDismiss(t.id); }}>×</button>
        </div>
      ))}
    </div>
  );
}
