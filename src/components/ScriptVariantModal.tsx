import { useEffect, useState } from 'react';
import { generateScriptVariants, type ScriptVariant } from '../integration/evaluationApi';
import styles from './ScriptVariantModal.module.css';

interface Props {
  open: boolean;
  topic: string;
  genre?: string;
  imageStyle?: string;
  language?: string;
  duration?: number;
  scriptProvider?: 'anthropic' | 'groq';
  token?: string;
  /** Called with the chosen variant's scenes (script JSON). Pass back to start full generation. */
  onChoose: (variant: ScriptVariant) => void;
  onClose:  () => void;
}

export function ScriptVariantModal({
  open, topic, genre, imageStyle, language, duration, scriptProvider, token,
  onChoose, onClose,
}: Props) {
  const [variants, setVariants] = useState<ScriptVariant[] | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [selected, setSelected] = useState<'A' | 'B' | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true); setError(null); setVariants(null); setSelected(null);

    generateScriptVariants({ topic, genre, imageStyle, language, duration, scriptProvider }, token)
      .then(res => { if (!cancelled) setVariants(res.variants); })
      .catch(e => { if (!cancelled) setError(e.message ?? 'Failed to generate variants'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [open, topic, genre, imageStyle, language, duration, scriptProvider, token]);

  if (!open) return null;

  const handleConfirm = () => {
    if (!variants || !selected) return;
    const chosen = variants.find(v => v.id === selected);
    if (chosen) onChoose(chosen);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.header}>
          <h2 className={styles.title}>Choose your script angle</h2>
          <p className={styles.subtitle}>Two AI-generated variants. Pick the one that hooks you more.</p>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </header>

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Generating 2 variants in parallel…</p>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <p>{error}</p>
            <button className={styles.cancelBtn} onClick={onClose}>Close</button>
          </div>
        )}

        {variants && (
          <>
            <div className={styles.grid}>
              {variants.map(v => (
                <button
                  key={v.id}
                  className={`${styles.variantCard} ${selected === v.id ? styles.variantSelected : ''}`}
                  onClick={() => setSelected(v.id)}
                >
                  <div className={styles.variantHeader}>
                    <span className={styles.variantBadge}>Variant {v.id}</span>
                    <span className={styles.variantDuration}>{v.duration}s · {v.scenes.length} scenes</span>
                  </div>
                  <h3 className={styles.variantTitle}>{v.title}</h3>
                  <div className={styles.sceneList}>
                    {v.scenes.slice(0, 4).map((s, i) => (
                      <div key={i} className={styles.sceneRow}>
                        <span className={styles.sceneTime}>{s.time}</span>
                        <span className={styles.sceneText}>{s.narration}</span>
                      </div>
                    ))}
                    {v.scenes.length > 4 && (
                      <div className={styles.sceneMore}>+ {v.scenes.length - 4} more scenes…</div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <footer className={styles.footer}>
              <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
              <button
                className={styles.confirmBtn}
                onClick={handleConfirm}
                disabled={!selected}
              >
                Generate video with Variant {selected ?? '–'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
