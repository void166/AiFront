import { useState, useRef, useEffect, useCallback } from 'react';
import type { GenerateVideoPayload, TtsProvider, ScriptProvider, SubtitleStyleOptions } from '@integration/types';
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

const SUBTITLE_CLASSIC: SubtitleStyleOptions = {
  fontSize: 18, bold: true, primaryColor: '#FFE000',
  outlineColor: '#000000', outlineThickness: 4, alignment: 2,
};

const STEP_LABELS = ['Topic', 'Genre', 'Style', 'Voice', 'Generate'];

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
  const [step, setStep]       = useState<Step>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [msgs, setMsgs]       = useState<Msg[]>([
    mkMsg('ai', 'Hey! 👋 What\'s your video topic?'),
  ]);
  const [draft, setDraft]     = useState('');
  const [form, setForm]       = useState<FormState>({
    topic: '', genre: 'scary', imageStyle: 'anime',
    ttsProvider: 'gemini', voiceId: 'Kore',
    language: 'mongolian', duration: 60, scriptProvider: 'anthropic',
  });

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const hasReset   = useRef(false);

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
      subtitleStyle:    SUBTITLE_CLASSIC,
      disableSubtitles: false,
    });
  };

  const handleReset = () => {
    hasReset.current = true;
    setStep(0);
    setIsTyping(false);
    setMsgs([mkMsg('ai', 'Hey! 👋 What\'s your video topic?')]);
    setDraft('');
    setForm({
      topic: '', genre: 'scary', imageStyle: 'anime',
      ttsProvider: 'gemini', voiceId: 'Kore',
      language: 'mongolian', duration: 60, scriptProvider: 'anthropic',
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
                <button
                  className={styles.generateBtn}
                  onClick={handleGenerate}
                  disabled={isLoading}
                >
                  ✨ Generate Video
                </button>
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
    </div>
  );
}
