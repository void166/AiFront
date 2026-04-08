import { useState, useRef, useEffect } from 'react';
import type { GenerateVideoPayload, TtsProvider, ScriptProvider, SubtitleStyleOptions } from '@integration/types';
import styles from './ChatInterface.module.css';

// ─── Data ─────────────────────────────────────────────────────────────────────
const GENRES = [
  { id: 'scary',         label: '👻 Scary',        color: '#1a0505', accent: '#ef4444' },
  { id: 'trueCrime',     label: '🔪 True Crime',    color: '#1a0a00', accent: '#f97316' },
  { id: 'conspiracy',    label: '🕵️ Conspiracy',    color: '#0d0a1a', accent: '#a855f7' },
  { id: 'darkHistory',   label: '💀 Dark History',  color: '#0a0a0a', accent: '#6b7280' },
  { id: 'psychology',    label: '🧠 Psychology',    color: '#000d1a', accent: '#3b82f6' },
  { id: 'mythology',     label: '⚔️ Mythology',     color: '#1a1500', accent: '#eab308' },
  { id: 'stoic',         label: '🧘 Stoic',         color: '#001a1a', accent: '#06b6d4' },
  { id: 'mythBusting',   label: '💥 Myth Busting',  color: '#0a1a00', accent: '#10b981' },
  { id: 'survival',      label: '🏕️ Survival',      color: '#0d1000', accent: '#84cc16' },
  { id: 'futuristic',    label: '🚀 Futuristic',    color: '#000a1a', accent: '#8b5cf6' },
  { id: 'biography',     label: '📖 Biography',     color: '#1a1000', accent: '#f59e0b' },
  { id: 'shockingFacts', label: '⚡ Shocking Facts', color: '#1a001a', accent: '#ec4899' },
  { id: 'business',      label: '💼 Business',      color: '#001a14', accent: '#14b8a6' },
  { id: 'sciExplained',  label: '🔬 Science',       color: '#001518', accent: '#22d3ee' },
  { id: 'education',     label: '📚 Education',     color: '#00051a', accent: '#60a5fa' },
];

const IMAGE_STYLES = [
  { id: 'anime',         label: 'Anime',         grad: 'linear-gradient(135deg,#7C3AED,#EC4899)' },
  { id: 'comic',         label: 'Comic',         grad: 'linear-gradient(135deg,#F97316,#EAB308)' },
  { id: 'creepyComic',   label: 'Creepy Comic',  grad: 'linear-gradient(135deg,#1F2937,#991B1B)' },
  { id: 'modernCartoon', label: 'Cartoon',       grad: 'linear-gradient(135deg,#3B82F6,#06B6D4)' },
  { id: 'disney',        label: 'Disney',        grad: 'linear-gradient(135deg,#6366F1,#EC4899)' },
  { id: 'simpsons',      label: 'Simpsons',      grad: 'linear-gradient(135deg,#EAB308,#F97316)' },
];

const TTS_PROVIDERS: { id: TtsProvider; label: string; desc: string }[] = [
  { id: 'gemini',     label: '✨ Gemini',     desc: 'Google — fast & natural' },
  { id: 'elevenlabs', label: '🎙 ElevenLabs', desc: 'Premium realistic' },
  { id: 'chimege',    label: '🇲🇳 Chimege',   desc: 'Mongolian specialist' },
];

const GEMINI_VOICES = [
  { id: 'Kore',   label: 'Kore — Calm' },
  { id: 'Charon', label: 'Charon — Deep' },
  { id: 'Aoede',  label: 'Aoede — Warm' },
  { id: 'Fenrir', label: 'Fenrir — Bold' },
  { id: 'Puck',   label: 'Puck — Energetic' },
  { id: 'Orbit',  label: 'Orbit — Smooth' },
];

const ELEVENLABS_VOICES = [
  { id: 'tZssYepgGaQmegsMEXjK', label: 'Dark & Haunting' },
  { id: 'L55dxfJcuGgA6v2SWaAQ', label: 'Whispery Dread' },
  { id: 'vflhOcwDlonnVFj3wJqz', label: 'Deep & Eerie' },
  { id: 'T4x5CtnhOiichhcqFzgg', label: 'Clear & Engaging' },
  { id: 'dtSEyYGNJqjrtBArPCVZ', label: 'Epic & Gravitas' },
];

const CHIMEGE_VOICES = [
  { id: 'FEMALE3v2', label: '🇲🇳 Female 3 (default)' },
  { id: 'FEMALE1',   label: '🇲🇳 Female 1' },
  { id: 'MALE1v2',   label: '🇲🇳 Male 1' },
  { id: 'MALE2v2',   label: '🇲🇳 Male 2' },
];

const TEMPLATES = [
  { label: '🌑 Dark Stoic Quote', topic: 'Marcus Aurelius wisdom for modern struggles' },
  { label: '🔪 True Crime Story', topic: 'The shocking disappearance of a small-town secret' },
  { label: '🧠 Mind-Bending Fact', topic: '5 facts about the human brain that will blow your mind' },
];

const SUBTITLE_CLASSIC: SubtitleStyleOptions = {
  fontSize: 18, bold: true, primaryColor: '#FFE000',
  outlineColor: '#000000', outlineThickness: 4, alignment: 2,
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 0 | 1 | 2 | 3 | 4;

interface Msg {
  role: 'ai' | 'user';
  text: string;
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

// ─── Component ────────────────────────────────────────────────────────────────
export function ChatInterface({ onSubmit, isLoading, onReset, isDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [msgs, setMsgs]   = useState<Msg[]>([
    { role: 'ai', text: 'What kind of video are we making today? 🎬' },
  ]);
  const [draft, setDraft] = useState('');
  const [form, setForm] = useState<FormState>({
    topic: '', genre: 'scary', imageStyle: 'anime',
    ttsProvider: 'gemini', voiceId: 'Kore',
    language: 'mongolian', duration: 60, scriptProvider: 'anthropic',
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, step]);

  // Reset when parent says so
  useEffect(() => {
    if (!isDone && !isLoading && step === 4) {
      // keep state — user can start new chat
    }
  }, [isDone, isLoading]);

  const addMsg = (role: 'ai' | 'user', text: string) => {
    setMsgs(prev => [...prev, { role, text }]);
  };

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
    addMsg('user', t);
    setTimeout(() => {
      addMsg('ai', '🔥 Love it! Now pick a genre to set the mood:');
      setStep(1);
    }, 300);
  };

  const handleGenreSelect = (genreId: string, genreLabel: string) => {
    setForm(f => ({ ...f, genre: genreId }));
    addMsg('user', genreLabel);
    setTimeout(() => {
      addMsg('ai', '🎨 Nice choice! How should the visuals look?');
      setStep(2);
    }, 300);
  };

  const handleStyleSelect = (styleId: string, styleLabel: string) => {
    setForm(f => ({ ...f, imageStyle: styleId }));
    addMsg('user', styleLabel);
    setTimeout(() => {
      addMsg('ai', '🎙 Almost there! Choose a voice & language:');
      setStep(3);
    }, 300);
  };

  const handleAudioDone = () => {
    const voiceName = getVoices(form.ttsProvider).find(v => v.id === form.voiceId)?.label ?? form.voiceId;
    addMsg('user', `${form.ttsProvider} · ${voiceName} · ${form.language === 'mongolian' ? '🇲🇳 Mongolian' : '🇬🇧 English'}`);
    setTimeout(() => {
      addMsg('ai', "✨ Perfect! Everything's set. Let's create your video:");
      setStep(4);
    }, 300);
  };

  const handleGenerate = () => {
    onSubmit({
      topic:         form.topic,
      genre:         form.genre,
      language:      form.language,
      imageStyle:    form.imageStyle,
      duration:      form.duration,
      transitionStyle: 'mixed',
      ttsProvider:   form.ttsProvider,
      voiceId:       form.voiceId,
      scriptProvider: form.scriptProvider,
      subtitleStyle: SUBTITLE_CLASSIC,
      disableSubtitles: false,
    });
  };

  const handleReset = () => {
    setStep(0);
    setMsgs([{ role: 'ai', text: 'What kind of video are we making today? 🎬' }]);
    setDraft('');
    setForm({ topic: '', genre: 'scary', imageStyle: 'anime', ttsProvider: 'gemini', voiceId: 'Kore', language: 'mongolian', duration: 60, scriptProvider: 'anthropic' });
    onReset?.();
  };

  const handleProviderChange = (p: TtsProvider) => {
    const first = getVoices(p)[0].id;
    setForm(f => ({ ...f, ttsProvider: p, voiceId: first }));
  };

  return (
    <div className={styles.chat}>
      {/* ── Messages ── */}
      <div className={styles.messages}>
        {msgs.map((m, i) => (
          <div key={i} className={`${styles.msgRow} ${m.role === 'user' ? styles.msgRowUser : ''}`}>
            {m.role === 'ai' && (
              <div className={styles.avatar}>⚡</div>
            )}
            <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAi}`}>
              {m.text}
            </div>
          </div>
        ))}

        {/* ── Active step rich media ── */}
        {!isLoading && !isDone && (
          <>
            {step === 1 && (
              <div className={`${styles.richCard} ${styles.anim}`}>
                <div className={styles.genreGrid}>
                  {GENRES.map(g => (
                    <button
                      key={g.id}
                      className={`${styles.genreCard} ${form.genre === g.id ? styles.genreCardActive : ''}`}
                      style={{
                        background: `linear-gradient(135deg, ${g.color} 0%, ${g.accent}22 100%)`,
                        borderColor: form.genre === g.id ? g.accent : 'rgba(255,255,255,0.08)',
                        boxShadow: form.genre === g.id ? `0 0 20px ${g.accent}44` : 'none',
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
              <div className={`${styles.richCard} ${styles.anim}`}>
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
              <div className={`${styles.richCard} ${styles.anim}`}>
                {/* TTS Provider */}
                <p className={styles.richLabel}>Voice Engine</p>
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

                {/* Voice */}
                <p className={styles.richLabel} style={{ marginTop: 14 }}>Narrator</p>
                <div className={styles.voiceRow}>
                  {getVoices(form.ttsProvider).map(v => (
                    <button
                      key={v.id}
                      className={`${styles.voicePill} ${form.voiceId === v.id ? styles.voicePillActive : ''}`}
                      onClick={() => setForm(f => ({ ...f, voiceId: v.id }))}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>

                {/* Language */}
                <p className={styles.richLabel} style={{ marginTop: 14 }}>Language</p>
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
                <p className={styles.richLabel} style={{ marginTop: 14 }}>
                  Duration <span className={styles.durationVal}>{form.duration}s</span>
                </p>
                <input
                  type="range" min={20} max={180} step={10}
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  className={styles.slider}
                />
                <div className={styles.sliderTicks}>
                  {[20, 60, 120, 180].map(v => <span key={v}>{v}s</span>)}
                </div>

                {/* Confirm */}
                <button className={styles.confirmAudio} onClick={handleAudioDone}>
                  Set Voice & Continue →
                </button>
              </div>
            )}

            {step === 4 && (
              <div className={`${styles.richCard} ${styles.anim}`}>
                {/* Summary card */}
                <div className={styles.summary}>
                  <div className={styles.summaryRow}><span className={styles.summaryKey}>Topic</span><span className={styles.summaryVal}>{form.topic}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryKey}>Genre</span><span className={styles.summaryVal}>{GENRES.find(g=>g.id===form.genre)?.label}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryKey}>Style</span><span className={styles.summaryVal}>{IMAGE_STYLES.find(s=>s.id===form.imageStyle)?.label}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryKey}>Voice</span><span className={styles.summaryVal}>{form.ttsProvider} · {getVoices(form.ttsProvider).find(v=>v.id===form.voiceId)?.label}</span></div>
                  <div className={styles.summaryRow}><span className={styles.summaryKey}>Duration</span><span className={styles.summaryVal}>{form.duration}s</span></div>
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

        {/* Generating state */}
        {isLoading && (
          <div className={styles.generatingRow}>
            <div className={styles.avatar}>⚡</div>
            <div className={`${styles.bubbleAi} ${styles.bubble}`}>
              <span className={styles.genDot} />
              <span className={styles.genDot} style={{ animationDelay: '0.2s' }} />
              <span className={styles.genDot} style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Done — new video CTA */}
        {isDone && (
          <div className={`${styles.richCard} ${styles.anim}`}>
            <p className={styles.doneText}>🎉 Video generated successfully!</p>
            <button className={styles.newVideoBtn} onClick={handleReset}>
              + New Video
            </button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar (step 0 only) ── */}
      {step === 0 && !isLoading && (
        <div className={styles.inputArea}>
          {/* Templates */}
          <div className={styles.templates}>
            {TEMPLATES.map(t => (
              <button
                key={t.label}
                className={styles.templatePill}
                onClick={() => handleTopicSubmit(t.topic)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="Describe your video topic…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) handleTopicSubmit(draft); }}
              autoFocus
            />
            <button
              className={styles.sendBtn}
              disabled={!draft.trim()}
              onClick={() => handleTopicSubmit(draft)}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
