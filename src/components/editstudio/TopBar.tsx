import styles from './TopBar.module.css';

export type VideoStatus = 'draft' | 'processing' | 'rendering' | 'completed' | 'failed';

interface Props {
  title: string;
  subtitle?: string;            // "Project · Topic · N scenes · 27.0s"
  status: VideoStatus;
  saving?:    boolean;
  rendering?: boolean;
  onBack:     () => void;
  onSave?:    () => void;
  onExport?:  () => void;
  userInitials?: string;
}

const STATUS_LABEL: Record<VideoStatus, string> = {
  draft:      'Draft',
  processing: 'Processing',
  rendering:  'Rendering',
  completed:  'Ready',
  failed:     'Failed',
};

export function TopBar({
  title, subtitle, status, saving, rendering, onBack, onSave, onExport, userInitials = 'AK',
}: Props) {
  return (
    <header className={styles.bar}>
      <button className={styles.logo} onClick={onBack} title="Back">
        <span className={styles.logoMark}>E</span>
        <span className={styles.logoName}>EditStudio</span>
      </button>

      <div className={styles.titleBlock}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>

      <div className={styles.actions}>
        <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
          <span className={styles.statusDot} />
          {STATUS_LABEL[status]}
        </span>

        <button className={styles.ghost} onClick={() => history.back()} title="Undo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14l-4-4 4-4"/><path d="M5 10h11a5 5 0 0 1 0 10h-3"/>
          </svg>
          <span>Undo</span>
        </button>

        <button className={styles.ghost} onClick={onSave} disabled={saving} title="Save">
          {saving
            ? <span className={styles.spin}/>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/>
                <path d="M17 21v-8H7v8M7 3v5h8"/>
              </svg>}
          <span>Save</span>
        </button>

        <button className={styles.primary} onClick={onExport} disabled={rendering} title="Export MP4">
          {rendering
            ? <><span className={styles.spin}/><span>Rendering…</span></>
            : <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>Export MP4</span>
              </>}
        </button>

        <div className={styles.avatar}>{userInitials}</div>
      </div>
    </header>
  );
}
