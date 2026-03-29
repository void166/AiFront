import type { GenerationStep } from '@integration/types';
import styles from './ProgressTracker.module.css';

interface Props {
  step: GenerationStep;
  error?: string | null;
}

const STEPS: { id: GenerationStep; label: string; icon: string }[] = [
  { id: 'writing_script',    label: 'Writing Script',    icon: '✍️' },
  { id: 'generating_images', label: 'Generating Scenes', icon: '🎨' },
  { id: 'generating_audio',  label: 'Voicing Characters',icon: '🎙️' },
  { id: 'rendering_video',   label: 'Rendering Video',   icon: '🎬' },
  { id: 'complete',          label: 'Done!',             icon: '✅' },
];

const STEP_ORDER: GenerationStep[] = [
  'writing_script',
  'generating_images',
  'generating_audio',
  'rendering_video',
  'complete',
];

function getStepIndex(step: GenerationStep): number {
  return STEP_ORDER.indexOf(step);
}

export function ProgressTracker({ step, error }: Props) {
  const currentIdx = getStepIndex(step);

  return (
    <div className={styles.container}>
      {/* Glowing bar */}
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${Math.max(0, (currentIdx / (STEP_ORDER.length - 1)) * 100)}%` }}
        />
      </div>

      {/* Steps list */}
      <div className={styles.steps}>
        {STEPS.map((s, idx) => {
          const isDone    = currentIdx > idx;
          const isActive  = currentIdx === idx && step !== 'error';
          const isError   = step === 'error' && idx === currentIdx;

          return (
            <div
              key={s.id}
              className={`${styles.step} ${isDone ? styles.done : ''} ${isActive ? styles.active : ''} ${isError ? styles.errored : ''}`}
            >
              <div className={styles.stepIcon}>
                {isDone ? '✓' : isError ? '✗' : s.icon}
              </div>
              <span className={styles.stepLabel}>{s.label}</span>
              {isActive && <span className={styles.pulse} />}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className={styles.errorBox}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
