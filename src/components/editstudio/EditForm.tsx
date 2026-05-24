import { useRef, useState } from 'react';
import type { SceneData, SceneTransitionPreset, SubtitleStyleOptions } from '@integration/types';
import styles from './EditForm.module.css';

export interface SubPreset { id: string; label: string; style?: SubtitleStyleOptions; disabled?: boolean }
export interface BgmOption { id: string; label: string }

interface Props {
  scene:           SceneData | null;
  sceneIndex:      number;
  sceneRole?:      string;
  onChangeNarration:   (v: string) => void;
  onChangeImagePrompt: (v: string) => void;
  onRegenNarration:    () => void;
  onRegenImagePrompt:  () => void;
  onRegenImage:        () => void;
  onRegenAudio:        () => void;
  onUploadImage:       (f: File) => void;
  onUploadAudio:       (f: File) => void;
  busy:             { img: boolean; audio: boolean; narr: boolean; prompt: boolean };
  voiceOptions:     { id: string; label: string }[];
  voice:            string;
  onChangeVoice:    (v: string) => void;

  transitionOptions: { id: SceneTransitionPreset; label: string }[];
  transition:        SceneTransitionPreset;
  onChangeTransition:(t: SceneTransitionPreset) => void;

  subPresets:        SubPreset[];
  subPresetId:       string;
  onChangeSubPreset: (id: string) => void;

  bgmOptions:        BgmOption[];
  bgmPath:           string;
  customBgmName:     string | null;
  uploadingBgm:      boolean;
  previewPlayingId:  string | null;
  onChangeBgm:       (id: string) => void;
  onPreviewBgm:      (id: string) => void;
  onUploadBgm:       (f: File) => void;

  rendering: boolean;
}

const SAMPLE = 'Sample';

function SubtitleSample({ preset }: { preset: SubPreset }) {
  const s = preset.style;
  if (!s) return null;
  const o = s.outlineThickness ?? 2;
  const oc = s.outlineColor ?? '#000';
  const outline = [
    `${o}px ${o}px 0 ${oc}`, `${-o}px ${o}px 0 ${oc}`,
    `${o}px ${-o}px 0 ${oc}`, `${-o}px ${-o}px 0 ${oc}`,
  ].join(', ');
  const style: React.CSSProperties = {
    color: s.primaryColor ?? '#fff',
    fontWeight: s.bold ? 800 : 500,
    fontSize: Math.max(9, (s.fontSize ?? 14) * 0.55) + 'px',
    textShadow: s.shadowDepth === 0 ? 'none' : outline,
    padding: s.backgroundBox ? '2px 5px' : 0,
    background: s.backgroundBox ? (s.boxColor ?? '#000') : 'transparent',
    borderRadius: s.backgroundBox ? 3 : 0,
    opacity: s.backgroundBox && s.boxOpacity ? Math.max(0.55, s.boxOpacity) : 1,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };
  return <span style={style}>{SAMPLE}</span>;
}

/* ─── Inline icon components ─────────────────────────────────────────────── */
const I = {
  sparkle: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>,
  refresh: () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></svg>,
  upload:  () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  chev:    (open: boolean) => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"/></svg>,
  play:    () => <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  pause:   () => <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>,
};

export function EditForm(p: Props) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const audInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  /* Collapsible sections — open by default so user can see/use the pickers */
  const [openTrans, setOpenTrans] = useState(true);
  const [openSub,   setOpenSub]   = useState(true);
  const [openBgm,   setOpenBgm]   = useState(true);

  const s = p.scene;
  if (!s) return <div className={styles.formEmpty}>Select a scene to edit</div>;

  const anyBusy = p.busy.img || p.busy.audio || p.busy.narr || p.busy.prompt || p.rendering;

  /* Small action button: icon-only, tooltip-described */
  const ActBtn = ({ title, onClick, busy, children }: {
    title: string; onClick: () => void; busy?: boolean; children: React.ReactNode;
  }) => (
    <button className={`${styles.iconBtn} ${busy ? styles.iconBusy : ''}`}
            title={title} onClick={onClick} disabled={anyBusy}>
      {busy ? <span className={styles.miniSpin}/> : children}
    </button>
  );

  /* Selected labels for collapsed-section preview */
  const transLabel = p.transitionOptions.find(t => t.id === p.transition)?.label ?? 'Auto';
  const subLabel   = p.subPresets.find(x => x.id === p.subPresetId)?.label ?? 'Classic';
  const bgmLabel   = p.customBgmName
    ? `Custom: ${p.customBgmName.length > 12 ? p.customBgmName.slice(0,10) + '…' : p.customBgmName}`
    : (p.bgmOptions.find(b => b.id === p.bgmPath)?.label ?? 'No music');

  return (
    <div className={styles.form}>
      {/* ── Narration ── */}
      <section className={styles.section}>
        <div className={styles.fieldHead}>
          <label className={styles.fieldLabel}>NARRATION</label>
          <div className={styles.actRow}>
            <ActBtn title="AI rewrite narration" onClick={p.onRegenNarration} busy={p.busy.narr}><I.sparkle/></ActBtn>
            <ActBtn title="Regenerate audio"   onClick={p.onRegenAudio}    busy={p.busy.audio}><I.refresh/></ActBtn>
            <ActBtn title="Upload audio"       onClick={() => audInputRef.current?.click()}><I.upload/></ActBtn>
            <input ref={audInputRef} type="file" accept="audio/*" hidden
                   onChange={e => { const f = e.target.files?.[0]; if (f) p.onUploadAudio(f); e.target.value = ''; }}/>
          </div>
        </div>
        <textarea
          className={styles.textarea}
          rows={3}
          value={s.narration ?? ''}
          onChange={e => p.onChangeNarration(e.target.value)}
          disabled={anyBusy}
          placeholder="Spoken line…"
        />
      </section>

      {/* ── Image prompt ── */}
      <section className={styles.section}>
        <div className={styles.fieldHead}>
          <label className={styles.fieldLabel}>IMAGE PROMPT</label>
          <div className={styles.actRow}>
            <ActBtn title="AI rewrite prompt" onClick={p.onRegenImagePrompt} busy={p.busy.prompt}><I.sparkle/></ActBtn>
            <ActBtn title="Regenerate image" onClick={p.onRegenImage}      busy={p.busy.img}><I.refresh/></ActBtn>
            <ActBtn title="Upload image"     onClick={() => imgInputRef.current?.click()}><I.upload/></ActBtn>
            <input ref={imgInputRef} type="file" accept="image/*" hidden
                   onChange={e => { const f = e.target.files?.[0]; if (f) p.onUploadImage(f); e.target.value = ''; }}/>
          </div>
        </div>
        <textarea
          className={`${styles.textarea} ${styles.textareaLg}`}
          rows={5}
          value={s.imagePrompt ?? ''}
          onChange={e => p.onChangeImagePrompt(e.target.value)}
          disabled={anyBusy}
          placeholder="Describe the visual…"
        />
      </section>

      {/* ── Collapsible: Transition ── */}
      <CollapsibleRow
        title="TRANSITION" preview={transLabel}
        open={openTrans} onToggle={() => setOpenTrans(o => !o)}>
        <div className={styles.pillRow}>
          {p.transitionOptions.map(t => (
            <button key={t.id}
              className={`${styles.pill} ${p.transition === t.id ? styles.pillActive : ''}`}
              onClick={() => p.onChangeTransition(t.id)}
              disabled={p.rendering}>
              {t.label}
            </button>
          ))}
        </div>
      </CollapsibleRow>

      {/* ── Collapsible: Subtitle picker ── */}
      <CollapsibleRow
        title="SUBTITLE" preview={subLabel}
        open={openSub} onToggle={() => setOpenSub(o => !o)}>
        <div className={styles.subGrid}>
          {p.subPresets.map(preset => {
            const active = p.subPresetId === preset.id;
            const isOff = preset.disabled;
            return (
              <button key={preset.id}
                className={`${styles.subCard} ${active ? styles.subCardActive : ''}`}
                onClick={() => p.onChangeSubPreset(preset.id)}
                disabled={p.rendering}
                type="button">
                <div className={styles.subStage}>
                  {isOff ? <span className={styles.subOff}>off</span> : <SubtitleSample preset={preset}/>}
                </div>
                <div className={styles.subLabel}>{preset.label}</div>
              </button>
            );
          })}
        </div>
      </CollapsibleRow>

      {/* ── Collapsible: BGM ── */}
      <CollapsibleRow
        title="MUSIC" preview={bgmLabel}
        open={openBgm} onToggle={() => setOpenBgm(o => !o)}>
        <div className={styles.bgmGrid}>
          {p.bgmOptions.map(b => {
            const active  = p.bgmPath === b.id && !p.customBgmName;
            const playing = p.previewPlayingId === b.id;
            return (
              <div key={b.id || 'none'}
                   className={`${styles.bgmCard} ${active ? styles.bgmActive : ''}`}>
                <button className={styles.bgmSelect}
                        onClick={() => p.onChangeBgm(b.id)}
                        disabled={p.rendering}>
                  <span className={styles.bgmDot} style={{ opacity: active ? 1 : 0.25 }}/>
                  {b.label}
                </button>
                {b.id && (
                  <button className={`${styles.bgmPlay} ${playing ? styles.bgmPlaying : ''}`}
                          onClick={() => p.onPreviewBgm(b.id)}
                          disabled={p.rendering}
                          title={playing ? 'Stop' : 'Play'}>
                    {playing ? <I.pause/> : <I.play/>}
                  </button>
                )}
              </div>
            );
          })}
          <label className={`${styles.bgmCard} ${styles.bgmUpload} ${p.customBgmName ? styles.bgmActive : ''}`}>
            <span className={styles.bgmSelect}>
              {p.uploadingBgm
                ? <><span className={styles.miniSpin}/>Uploading…</>
                : p.customBgmName
                  ? <>♫ Custom</>
                  : <>+ Upload</>}
            </span>
            <input ref={bgmInputRef} type="file" accept="audio/*" hidden
                   disabled={p.rendering}
                   onChange={e => { const f = e.target.files?.[0]; if (f) p.onUploadBgm(f); e.target.value = ''; }}/>
          </label>
        </div>
      </CollapsibleRow>
    </div>
  );
}

/* ─── Collapsible section helper ─────────────────────────────────────────── */
function CollapsibleRow({ title, preview, open, onToggle, children }: {
  title: string; preview: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <section className={styles.collapse}>
      <button className={styles.collapseHead} onClick={onToggle} type="button">
        <span className={styles.collapseTitle}>{title}</span>
        <span className={styles.collapsePreview}>{preview}</span>
        <span className={styles.collapseChev} style={{ transform: open ? 'rotate(180deg)' : '' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>
      {open && <div className={styles.collapseBody}>{children}</div>}
    </section>
  );
}
