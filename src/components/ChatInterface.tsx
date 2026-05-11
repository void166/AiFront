import { useState, useRef, useEffect, useCallback } from 'react';
import type { GenerateVideoPayload, TtsProvider, ScriptProvider, SubtitleStyleOptions } from '@integration/types';
import { useAuth } from '../context/AuthContext';
import { ScriptVariantModal } from './ScriptVariantModal';
import styles from './ChatInterface.module.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const GENRES = [
  { id: 'scary',         label: '👻 Scary',         color: '#1a0505', accent: '#ef4444' },
  { id: 'trueCrime',     label: '🔪 True Crime',     color: '#1a0a00', accent: '#f97316' },
  { id: 'conspiracy',    label: '🕵️ Conspiracy',     color: '#0d0a1a', accent: '#a855f7' },
  { id: 'darkHistory',   label: '💀 Dark History',   color: '#0a0a0a', accent: '#6b7280' },
  { id: 'psychology',    label: '🧠 Psychology',     color: '#000d1a', accent: '#3b82f6' },
  { id: 'mythology',     label: '⚔️ Mythology',      color: '#1a1500', accent: '#eab308' },
  { id: 'stoic',         label: '🧘 Stoic',          color: '#001a1a', accent: '#06b6d4' },
  { id: 'mythBusting',   label: '💥 Myth Busting',   color: '#0a1a00', accent: '#10b981' },
  { id: 'survival',      label: '🏕️ Survival',       color: '#0d1000', accent: '#84cc16' },
  { id: 'futuristic',    label: '🚀 Futuristic',     color: '#000a1a', accent: '#8b5cf6' },
  { id: 'biography',     label: '📖 Biography',      color: '#1a1000', accent: '#f59e0b' },
  { id: 'shockingFacts', label: '⚡ Shocking Facts',  color: '#1a001a', accent: '#ec4899' },
  { id: 'business',      label: '💼 Business',       color: '#001a14', accent: '#14b8a6' },
  { id: 'sciExplained',  label: '🔬 Science',        color: '#001518', accent: '#22d3ee' },
  { id: 'education',     label: '📚 Education',      color: '#00051a', accent: '#60a5fa' },
];

const IMAGE_STYLES = [
  { id: 'anime',         label: 'Anime',        grad: 'linear-gradient(135deg,#7C3AED,#EC4899)' },
  { id: 'comic',         label: 'Comic',        grad: 'linear-gradient(135deg,#F97316,#EAB308)' },
  { id: 'creepyComic',   label: 'Creepy Comic', grad: 'linear-gradient(135deg,#1F2937,#991B1B)' },
  { id: 'modernCartoon', label: 'Cartoon',      grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  { id: 'disney',        label: 'Disney',       grad: 'linear-gradient(135deg,#6366F1,#EC4899)' },
  { id: 'simpsons',      label: 'Simpsons',     grad: 'linear-gradient(135deg,#EAB308,#F97316)' },
];

const TTS_PROVIDERS: { id: TtsProvider; label: string; desc: string }[] = [
  { id: 'gemini',     label: '✨ Gemini',     desc: 'Google · Fast & natural' },
  { id: 'elevenlabs', label: '🎙 ElevenLabs', desc: 'Premium realistic' },
  { id: 'chimege',    label: '🇲🇳 Chimege',   desc: 'Mongolian specialist' },
];

const GEMINI_VOICES     = [
  { id: 'Kore',   label: 'Kore',   sub: 'Calm' },
  { id: 'Charon', label: 'Charon', sub: 'Deep' },
  { id: 'Aoede',  label: 'Aoede',  sub: 'Warm' },
  { id: 'Fenrir', label: 'Fenrir', sub: 'Bold' },
  { id: 'Puck',   label: 'Puck',   sub: 'Lively' },
  { id: 'Orbit',  label: 'Orbit',  sub: 'Smooth' },
];
const ELEVENLABS_VOICES = [
  { id: 'tZssYepgGaQmegsMEXjK', label: 'Dark & Haunting',   sub: 'Cinematic' },
  { id: 'L55dxfJcuGgA6v2SWaAQ', label: 'Whispery Dread',    sub: 'Horror' },
  { id: 'vflhOcwDlonnVFj3wJqz', label: 'Deep & Eerie',      sub: 'Mystery' },
  { id: 'T4x5CtnhOiichhcqFzgg', label: 'Clear & Engaging',  sub: 'Narrative' },
  { id: 'dtSEyYGNJqjrtBArPCVZ', label: 'Epic & Gravitas',   sub: 'Drama' },
];
const CHIMEGE_VOICES    = [
  { id: 'FEMALE3v2', label: 'Female 3', sub: '🇲🇳 Default' },
  { id: 'FEMALE1',   label: 'Female 1', sub: '🇲🇳 Soft' },
  { id: 'MALE1v2',   label: 'Male 1',   sub: '🇲🇳 Deep' },
  { id: 'MALE2v2',   label: 'Male 2',   sub: '🇲🇳 Clear' },
];

const TEMPLATES = [
  { label: '🌑 Dark Stoic', topic: 'Marcus Aurelius wisdom for modern struggles' },
  { label: '🔪 True Crime', topic: 'The shocking disappearance of a small-town secret' },
  { label: '🧠 Mind-Bending', topic: '5 facts about the human brain that will blow your mind' },
];

const SCRIPT_PROVIDERS: { id: ScriptProvider; label: string; desc: string }[] = [
  { id: 'anthropic', label: '🤖 Claude',  desc: 'Best quality' },
  { id: 'groq',      label: '⚡ Groq',    desc: 'Ultra fast' },
];

// ─── Subtitle presets (used in Optional settings) ────────────────────────────
const SUBTITLE_PRESETS: { id: string; label: string; style: SubtitleStyleOptions | null }[] = [
  { id: 'classic', label: 'Classic',
    style: { fontSize: 18, bold: true,  primaryColor: '#FFE000', outlineColor: '#000000', outlineThickness: 4, alignment: 2 } },
  { id: 'white',   label: 'White',
    style: { fontSize: 18, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 2 } },
  { id: 'top',     label: 'Top',
    style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 10, marginV: 60 } },
  { id: 'minimal', label: 'Minimal',
    style: { fontSize: 14, bold: false, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 1, shadowDepth: 0, alignment: 2 } },
  { id: 'box',     label: 'Boxed',
    style: { fontSize: 17, bold: true,  primaryColor: '#FFFFFF', backgroundBox: true, boxColor: '#000000', boxOpacity: 0.65, alignment: 2 } },
  { id: 'off',     label: 'No subtitles', style: null },
];

const SUBTITLE_CLASSIC = SUBTITLE_PRESETS[0].style!;

// ─── BGM library — must match backend BGM_LIBRARY keys ───────────────────────
const BGM_OPTIONS = [
  { id: '',           label: 'No music' },
  { id: 'scary1',     label: 'Scary' },
  { id: 'history1',   label: 'History 1' },
  { id: 'history2',   label: 'History 2' },
  { id: 'education1', label: 'Education 1' },
  { id: 'education2', label: 'Education 2' },
  { id: 'stoic1',     label: 'Stoic 1' },
  { id: 'stoic2',     label: 'Stoic 2' },
  { id: 'trueCrime1', label: 'True Crime 1' },
  { id: 'trueCrime2', label: 'True Crime 2' },
];

const TRANSITION_OPTIONS: { id: NonNullable<GenerateVideoPayload['globalTransition']>; label: string }[] = [
  { id: 'auto',      label: 'Auto (mixed)' },
  { id: 'fade',      label: 'Fade' },
  { id: 'fadeblack', label: 'Fade Black' },
  { id: 'wiperight', label: 'Wipe →' },
  { id: 'wipeleft',  label: '← Wipe' },
  { id: 'hard-cut',  label: 'Hard Cut' },
];

const STEP_LABELS = ['Topic', 'Genre', 'Style', 'Voice', 'Generate'];

// Resolve BGM preview URL based on environment
const BGM_BASE_URL: string =
  typeof (import.meta as any).env !== 'undefined'
    ? ((import.meta as any).env.VITE_API_URL ?? '')
    : '';

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 0 | 1 | 2 | 3 | 4;

interface Msg {
  role: 'ai' | 'user';
  text: string;
  id: number;
}

interface FormState {
  topic: string;
  genre: string;
  imageStyle: string;
  ttsProvider: TtsProvider;
  voiceId: string;
  language: string;
  duration: number;
  scriptProvider: ScriptProvider;
  // ── Optional settings (revealed via the "Advanced" toggle) ──
  subtitlePreset: string;                                // SUBTITLE_PRESETS.id
  bgmPath: string;                                       // '' = none
  bgmVolume: number;                                     // 0–1
  globalTransition: NonNullable<GenerateVideoPayload['globalTransition']>;
}

interface Props {
  onSubmit: (payload: GenerateVideoPayload) => void;
  isLoading: boolean;
  onReset?: () => void;
  isDone?: boolean;
}

let msgIdCounter = 0;
const mkMsg = (role: 'ai' | 'user', text: string): Msg => ({ role, text, id: ++msgIdCounter });

// ─── Component ────────────────────────────────────────────────────────────────
export function ChatInterface({ onSubmit, isLoading, onReset, isDone }: Props) {
  const { token } = useAuth();
  const [step, setStep]       = useState<Step>(0);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([
    mkMsg('ai', 'Hey! 👋 What\'s your video topic?'),
  ]);
  const [draft, setDraft]     = useState('');
  const [form, setForm]       = useState<FormState>({
    topic: '', genre: 'scary', imageStyle: 'anime',
    ttsProvider: 'gemini', voiceId: 'Kore',
    language: 'mongolian', duration: 60, scriptProvider: 'anthropic',
    subtitlePreset: 'classic', bgmPath: '', bgmVolume: 0.15, globalTransition: 'auto',
  });

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hasReset   = useRef(false);

  // BGM preview audio (single shared player so only one track plays at a time)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const [showAdvanced,   setShowAdvanced]   = useState(false);

  const playPreview = useCallback((bgmId: string) => {
    if (!bgmId) return;
    // Stop currently-playing preview if any
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewPlaying === bgmId) {
      setPreviewPlaying(null);
      return;
    }
    const audio = new Audio(`${BGM_BASE_URL}/bgm/${bgmId}.mp3`);
    audio.volume = 0.7;
    audio.onended = () => setPreviewPlaying(null);
    audio.onerror = () => setPreviewPlaying(null);
    previewAudioRef.current = audio;
    setPreviewPlaying(bgmId);
    audio.play().catch(() => setPreviewPlaying(null));
  }, [previewPlaying]);

  // Stop any preview when component unmounts
  useEffect(() => () => {
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
  }, []);

  // Auto-scroll whenever messages or typing state change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, isTyping, step]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── ai reply with typing indicator ────────────────────────────────────────
  const aiReply = useCallback((text: string, delay = 700) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMsgs(prev => [...prev, mkMsg('ai', text)]);
    }, delay);
  }, []);

  const addUserMsg = (text: string) =>
    setMsgs(prev => [...prev, mkMsg('user', text)]);

  const getVoices = (provider: TtsProvider) => {
    if (provider === 'elevenlabs') return ELEVENLABS_VOICES;
    if (provider === 'chimege')    return CHIMEGE_VOICES;
    return GEMINI_VOICES;
  };

  // ── Step handlers ──────────────────────────────────────────────────────────
  const handleTopicSubmit = (topic: string) => {
    if (!topic.trim()) return;
    const t = topic.trim();
    setForm(f => ({ ...f, topic: t }));
    setDraft('');
    addUserMsg(t);
    setStep(1);
    aiReply('🔥 Love it! Pick a genre to set the mood:');
  };

  const handleGenreSelect = (genreId: string, genreLabel: string) => {
    setForm(f => ({ ...f, genre: genreId }));
    addUserMsg(genreLabel);
    setStep(2);
    aiReply('🎨 Great choice! Now pick a visual style:');
  };

  const handleStyleSelect = (styleId: string, styleLabel: string) => {
    setForm(f => ({ ...f, imageStyle: styleId }));
    addUserMsg(styleLabel);
    setStep(3);
    aiReply('🎙 Almost done! Set your voice & language:');
  };

  const handleAudioDone = () => {
    const voiceName = getVoices(form.ttsProvider).find(v => v.id === form.voiceId)?.label ?? form.voiceId;
    addUserMsg(`${form.ttsProvider} · ${voiceName} · ${form.language === 'mongolian' ? '🇲🇳 Mongolian' : '🇬🇧 English'}`);
    setStep(4);
    aiReply("✨ Everything's set! Here's your summary — ready to generate:");
  };

  const handleGenerate = () => {
    const preset = SUBTITLE_PRESETS.find(p => p.id === form.subtitlePreset);
    onSubmit({
      topic:            form.topic,
      genre:            form.genre,
      language:         form.language,
      imageStyle:       form.imageStyle,
      duration:         form.duration,
      transitionStyle:  'mixed',
      ttsProvider:      form.ttsProvider,
      voiceId:          form.voiceId,
      scriptProvider:   form.scriptProvider,
      subtitleStyle:    preset?.style ?? SUBTITLE_CLASSIC,
      disableSubtitles: preset?.style === null,
      bgmPath:          form.bgmPath || undefined,
      bgmVolume:        form.bgmVolume,
      globalTransition: form.globalTransition,
    });
    // Stop any preview audio when generation begins
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewPlaying(null);
  };

  const handleReset = () => {
    hasReset.current = true;
    setStep(0);
    setIsTyping(false);
    setMsgs([mkMsg('ai', 'Hey! 👋 What\'s your video topic?')]);
    setDraft('');
    setShowAdvanced(false);
    previewAudioRef.current?.pause();
    previewAudioRef.current = null;
    setPreviewPlaying(null);
    setForm({
      topic: '', genre: 'scary', imageStyle: 'anime',
      ttsProvider: 'gemini', voiceId: 'Kore',
      language: 'mongolian', duration: 60, scriptProvider: 'anthropic',
      subtitlePreset: 'classic', bgmPath: '', bgmVolume: 0.15, globalTransition: 'auto',
    });
    onReset?.();
  };

  const handleProviderChange = (p: TtsProvider) => {
    const first = getVoices(p)[0].id;
    setForm(f => ({ ...f, ttsProvider: p, voiceId: first }));
  };

  // Placeholder text per step
  const inputPlaceholder = [
    'Describe your video topic…',
    'Choose a genre above ↑',
    'Choose a visual style above ↑',
    'Configure voice settings above ↑',
    'Click Generate to create your video ↑',
  ][step];

  const inputDisabled = step > 0 || isLoading;

  return (
    <div className={styles.chat}>

      {/* ── Header ── */}
      <div className={styles.chatHeader}>
        <div className={styles.chatHeaderLeft}>
          <div className={styles.chatAvatar}>⚡</div>
          <div>
            <div className={styles.chatName}>ViralAI</div>
            <div className={styles.chatStatus}>
              <span className={styles.statusDot} />
              {isLoading ? 'Generating your video…' : isTyping ? 'Typing…' : 'Online'}
            </div>
          </div>
        </div>

        {/* Step progress pills */}
        <div className={styles.stepPills}>
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              className={`${styles.stepPill} ${i < step ? styles.stepDone : i === step ? styles.stepActive : ''}`}
            >
              {i < step ? '✓' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className={styles.messages}>
        {msgs.map((m) => (
          <div key={m.id} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgRowUser : ''}`}>
            {m.role === 'ai' && <div className={styles.avatarSmall}>⚡</div>}
            <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
              {m.text}
            </div>
          </div>
        ))}

        {/* AI typing indicator */}
        {isTyping && (
          <div className={`${styles.msgRow} ${styles.typingRow}`}>
            <div className={styles.avatarSmall}>⚡</div>
            <div className={`${styles.bubble} ${styles.bubbleAi} ${styles.typingBubble}`}>
              <span className={styles.dot} />
              <span className={styles.dot} style={{ animationDelay: '0.18s' }} />
              <span className={styles.dot} style={{ animationDelay: '0.36s' }} />
            </div>
          </div>
        )}

        {/* ── Active step rich media (inline in chat) ── */}
        {!isTyping && !isLoading && !isDone && (
          <>
            {step === 1 && (
              <div className={`${styles.richCard} ${styles.fadeUp}`}>
                <div className={styles.genreGrid}>
                  {GENRES.map(g => (
                    <button
                      key={g.id}
                      className={`${styles.genreCard} ${form.genre === g.id ? styles.genreCardActive : ''}`}
                      style={{
                        background: `linear-gradient(135deg, ${g.color} 0%, ${g.accent}26 100%)`,
                        borderColor: form.genre === g.id ? g.accent : 'rgba(255,255,255,0.08)',
                        boxShadow:   form.genre === g.id ? `0 0 18px ${g.accent}50` : 'none',
                      }}
                      onClick={() => handleGenreSelect(g.id, g.label)}
                    >
                      <span className={styles.genreLabel}>{g.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={`${styles.richCard} ${styles.fadeUp}`}>
                <p className={styles.cardHint}>Tap a style to continue</p>
                <div className={styles.styleRow}>
                  {IMAGE_STYLES.map(s => (
                    <button
                      key={s.id}
                      className={`${styles.styleCard} ${form.imageStyle === s.id ? styles.styleCardActive : ''}`}
                      style={{ background: s.grad }}
                      onClick={() => handleStyleSelect(s.id, s.label)}
                    >
                      <span className={styles.styleLabel}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={`${styles.richCard} ${styles.fadeUp}`}>
                {/* Script Model */}
                <p className={styles.sectionLabel}>Script Model</p>
                <div className={styles.providerRow} style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 16 }}>
                  {SCRIPT_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      className={`${styles.providerBtn} ${form.scriptProvider === p.id ? styles.providerActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, scriptProvider: p.id }))}
                    >
                      <span className={styles.providerName}>{p.label}</span>
                      <span className={styles.providerDesc}>{p.desc}</span>
                    </button>
                  ))}
                </div>

                {/* TTS Provider */}
                <p className={styles.sectionLabel}>Voice Engine</p>
                <div className={styles.providerRow}>
                  {TTS_PROVIDERS.map(p => (
                    <button
                      key={p.id}
                      className={`${styles.providerBtn} ${form.ttsProvider === p.id ? styles.providerActive : ''}`}
                      onClick={() => handleProviderChange(p.id)}
                    >
                      <span className={styles.providerName}>{p.label}</span>
                      <span className={styles.providerDesc}>{p.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Voice picker */}
                <p className={styles.sectionLabel} style={{ marginTop: 14 }}>Narrator</p>
                <div className={styles.voiceGrid}>
                  {getVoices(form.ttsProvider).map(v => (
                    <button
                      key={v.id}
                      className={`${styles.voiceCard} ${form.voiceId === v.id ? styles.voiceCardActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, voiceId: v.id }))}
                    >
                      <span className={styles.voiceName}>{v.label}</span>
                      <span className={styles.voiceSub}>{v.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Language */}
                <p className={styles.sectionLabel} style={{ marginTop: 14 }}>Language</p>
                <div className={styles.langRow}>
                  {(['mongolian', 'english'] as const).map(l => (
                    <button
                      key={l}
                      className={`${styles.langBtn} ${form.language === l ? styles.langActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, language: l }))}
                    >
                      {l === 'mongolian' ? '🇲🇳 Mongolian' : '🇬🇧 English'}
                    </button>
                  ))}
                </div>

                {/* Duration */}
                <div className={styles.durationRow}>
                  <p className={styles.sectionLabel}>Duration</p>
                  <span className={styles.durationVal}>{form.duration}s</span>
                </div>
                <input
                  type="range" min={20} max={180} step={10}
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  className={styles.slider}
                />
                <div className={styles.sliderTicks}>
                  {[20, 60, 120, 180].map(v => <span key={v}>{v}s</span>)}
                </div>

                {/* ── Advanced (optional) section ── */}
                <button
                  type="button"
                  className={styles.advancedToggle}
                  onClick={() => setShowAdvanced(s => !s)}
                >
                  <span>{showAdvanced ? '▾' : '▸'}</span> Advanced settings (optional)
                </button>

                {showAdvanced && (
                  <div className={styles.advancedPanel}>
                    {/* Subtitle */}
                    <p className={styles.sectionLabel}>Subtitle Style</p>
                    <div className={styles.optRow}>
                      {SUBTITLE_PRESETS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          className={`${styles.optBtn} ${form.subtitlePreset === p.id ? styles.optActive : ''}`}
                          onClick={() => setForm(f => ({ ...f, subtitlePreset: p.id }))}
                        >{p.label}</button>
                      ))}
                    </div>

                    {/* Background Music with preview */}
                    <p className={styles.sectionLabel} style={{ marginTop: 14 }}>Background Music</p>
                    <div className={styles.bgmList}>
                      {BGM_OPTIONS.map(b => {
                        const isActive  = form.bgmPath === b.id;
                        const isPlaying = previewPlaying === b.id;
                        return (
                          <div key={b.id || 'none'}
                               className={`${styles.bgmItem} ${isActive ? styles.bgmActive : ''}`}>
                            <button
                              type="button"
                              className={styles.bgmSelectBtn}
                              onClick={() => setForm(f => ({ ...f, bgmPath: b.id }))}
                            >
                              <span className={styles.bgmDot} style={{ opacity: isActive ? 1 : 0.3 }} />
                              {b.label}
                            </button>
                            {b.id && (
                              <button
                                type="button"
                                className={`${styles.bgmPlayBtn} ${isPlaying ? styles.bgmPlaying : ''}`}
                                onClick={() => playPreview(b.id)}
                                title={isPlaying ? 'Stop preview' : 'Play preview'}
                              >
                                {isPlaying
                                  ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>
                                  : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* BGM volume slider */}
                    {form.bgmPath && (
                      <>
                        <div className={styles.durationRow} style={{ marginTop: 12 }}>
                          <p className={styles.sectionLabel}>Music Volume</p>
                          <span className={styles.durationVal}>{Math.round(form.bgmVolume * 100)}%</span>
                        </div>
                        <input
                          type="range" min={0} max={0.6} step={0.05}
                          value={form.bgmVolume}
                          onChange={e => setForm(f => ({ ...f, bgmVolume: Number(e.target.value) }))}
                          className={styles.slider}
                        />
                        <div className={styles.sliderTicks}>
                          <span>0%</span><span>30%</span><span>60%</span>
                        </div>
                      </>
                    )}

                    {/* Global Transition */}
                    <p className={styles.sectionLabel} style={{ marginTop: 14 }}>Scene Transition</p>
                    <div className={styles.optRow}>
                      {TRANSITION_OPTIONS.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          className={`${styles.optBtn} ${form.globalTransition === t.id ? styles.optActive : ''}`}
                          onClick={() => setForm(f => ({ ...f, globalTransition: t.id }))}
                        >{t.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                <button className={styles.confirmBtn} onClick={handleAudioDone}>
                  Continue →
                </button>
              </div>
            )}

            {step === 4 && (
              <div className={`${styles.richCard} ${styles.fadeUp}`}>
                <div className={styles.summary}>
                  {[
                    { k: 'Topic',    v: form.topic },
                    { k: 'Genre',    v: GENRES.find(g => g.id === form.genre)?.label ?? '' },
                    { k: 'Style',    v: IMAGE_STYLES.find(s => s.id === form.imageStyle)?.label ?? '' },
                    { k: 'Voice',    v: `${form.ttsProvider} · ${getVoices(form.ttsProvider).find(v => v.id === form.voiceId)?.label ?? ''}` },
                    { k: 'Duration', v: `${form.duration}s` },
                  ].map(row => (
                    <div key={row.k} className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{row.k}</span>
                      <span className={styles.summaryVal}>{row.v}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.generateActions}>
                  <button
                    className={styles.generateBtn}
                    onClick={handleGenerate}
                    disabled={isLoading}
                  >
                    ✨ Generate Video
                  </button>
                  <button
                    className={styles.compareBtn}
                    onClick={() => setShowVariantModal(true)}
                    disabled={isLoading}
                    title="Generate 2 script variants and pick the better one"
                  >
                    Compare 2 variants
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Generating → loading bubbles */}
        {isLoading && (
          <div className={styles.msgRow}>
            <div className={styles.avatarSmall}>⚡</div>
            <div className={`${styles.bubble} ${styles.bubbleAi}`}>
              🎬 Generating your video, hang tight…
            </div>
          </div>
        )}

        {/* Done */}
        {isDone && (
          <div className={`${styles.richCard} ${styles.fadeUp}`}>
            <p className={styles.doneText}>🎉 Video generated! Check it on the left.</p>
            <button className={styles.newVideoBtn} onClick={handleReset}>
              + New Video
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input area (always visible) ── */}
      {!isLoading && (
        <div className={styles.inputArea}>
          {step === 0 && (
            <div className={styles.templates}>
              {TEMPLATES.map(t => (
                <button key={t.label} className={styles.templatePill}
                  onClick={() => handleTopicSubmit(t.topic)}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={`${styles.input} ${inputDisabled ? styles.inputDisabled : ''}`}
              placeholder={inputPlaceholder}
              value={step === 0 ? draft : ''}
              onChange={e => { if (step === 0) setDraft(e.target.value); }}
              onKeyDown={e => { if (e.key === 'Enter' && draft.trim() && step === 0) handleTopicSubmit(draft); }}
              disabled={inputDisabled}
              readOnly={inputDisabled}
              autoFocus={step === 0}
            />
            <button
              className={styles.sendBtn}
              disabled={!draft.trim() || step !== 0}
              onClick={() => handleTopicSubmit(draft)}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Script Variant Modal (A/B comparison before generating) ── */}
      <ScriptVariantModal
        open={showVariantModal}
        topic={form.topic}
        genre={form.genre}
        imageStyle={form.imageStyle}
        language={form.language}
        duration={form.duration}
        scriptProvider={form.scriptProvider}
        token={token ?? undefined}
        onClose={() => setShowVariantModal(false)}
        onChoose={(variant) => {
          setShowVariantModal(false);
          // Use the variant's title and let the user generate with the same options.
          // The backend will regenerate the script on its own; for now we just
          // pass through and rely on the existing generate flow — the user has
          // already seen the previewed variant they want.
          handleGenerate();
          // TODO future: pass `prefScript` to backend so it doesn't re-generate.
          console.log('User chose variant', variant.id, '—', variant.title);
        }}
      />
    </div>
  );
}
