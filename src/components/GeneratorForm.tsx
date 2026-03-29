import { useState } from 'react';
import type { GenerateVideoPayload, TransitionStyle, SubtitleStyleOptions, TtsProvider } from '@integration/types';
import styles from './GeneratorForm.module.css';

// ─── Subtitle presets ─────────────────────────────────────────────────────────
interface SubtitlePreset {
  id: string;
  label: string;
  emoji: string;
  disabled?: boolean;
  style?: SubtitleStyleOptions;
}

const SUBTITLE_PRESETS: SubtitlePreset[] = [
  {
    id: 'classic',
    label: 'Classic',
    emoji: '🔤',
    style: { fontSize: 18, bold: true, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 2 },
  },
  {
    id: 'yellow',
    label: 'Yellow',
    emoji: '🟡',
    style: { fontSize: 20, bold: true, primaryColor: '#FFE000', outlineColor: '#000000', outlineThickness: 4, alignment: 2 },
  },
  {
    id: 'top',
    label: 'Top',
    emoji: '⬆️',
    style: { fontSize: 17, bold: true, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 3, alignment: 10, marginV: 60 },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    emoji: '🤏',
    style: { fontSize: 14, bold: false, primaryColor: '#FFFFFF', outlineColor: '#000000', outlineThickness: 1, shadowDepth: 0, alignment: 2 },
  },
  {
    id: 'box',
    label: 'Box',
    emoji: '📦',
    style: { fontSize: 17, bold: true, primaryColor: '#FFFFFF', backgroundBox: true, boxColor: '#000000', boxOpacity: 0.65, alignment: 2 },
  },
  {
    id: 'off',
    label: 'Off',
    emoji: '🚫',
    disabled: true,
  },
];

// ─── TTS providers ────────────────────────────────────────────────────────────
const TTS_PROVIDERS: { id: TtsProvider; label: string; desc: string }[] = [
  { id: 'gemini',      label: '✨ Gemini',      desc: 'Google AI — fast & natural' },
  { id: 'elevenlabs',  label: '🎙 ElevenLabs',  desc: 'Premium — realistic voices' },
  { id: 'chimege',     label: '🇲🇳 Chimege',     desc: 'Mongolian specialist TTS' },
];

// ─── Voice options per TTS provider ──────────────────────────────────────────
const ELEVENLABS_VOICES: Record<string, { id: string; label: string }[]> = {
  scary: [
    { id: 'tZssYepgGaQmegsMEXjK', label: '👻 Voice 1 — Dark & Haunting' },
    { id: 'L55dxfJcuGgA6v2SWaAQ', label: '👻 Voice 2 — Whispery Dread' },
    { id: 'vflhOcwDlonnVFj3wJqz', label: '👻 Voice 3 — Deep & Eerie' },
  ],
  education: [
    { id: 'T4x5CtnhOiichhcqFzgg', label: '📚 Voice 1 — Clear & Engaging' },
    { id: 'QngvLQR8bsLR5bzoa6Vv', label: '📚 Voice 2 — Warm & Steady' },
    { id: 'X1jCiTiZo6yr6tNO9AG8', label: '📚 Voice 3 — Crisp & Informative' },
  ],
  history: [
    { id: 'dtSEyYGNJqjrtBArPCVZ', label: '📜 Voice 1 — Epic & Gravitas' },
    { id: 'G7ILShrCNLfmS0A37SXS', label: '📜 Voice 2 — Authoritative' },
    { id: 'Gsndh0O5AnuI2Hj3YUlA', label: '📜 Voice 3 — Cinematic' },
  ],
};

const GEMINI_VOICES: { id: string; label: string }[] = [
  { id: 'Kore',    label: '✨ Kore — Calm & Clear' },
  { id: 'Charon',  label: '✨ Charon — Deep & Dramatic' },
  { id: 'Aoede',   label: '✨ Aoede — Warm & Bright' },
  { id: 'Fenrir',  label: '✨ Fenrir — Bold & Powerful' },
  { id: 'Puck',    label: '✨ Puck — Energetic & Light' },
  { id: 'Orbit',   label: '✨ Orbit — Smooth & Modern' },
];

// Chimege-д voice сонголт шаарддаггүй (default ашиглана)
const CHIMEGE_VOICES: { id: string; label: string }[] = [
  { id: 'FEMALE3v2', label: '🇲🇳 Female 3 (default)' },
  { id: 'FEMALE1',   label: '🇲🇳 Female 1' },
  { id: 'FEMALE1v2', label: '🇲🇳 Female 1 v2' },
  { id: 'FEMALE2v2', label: '🇲🇳 Female 2 v2' },
  { id: 'FEMALE4v2', label: '🇲🇳 Female 4 v2' },
  { id: 'FEMALE5v2', label: '🇲🇳 Female 5 v2' },
  { id: 'MALE1',     label: '🇲🇳 Male 1' },
  { id: 'MALE1v2',   label: '🇲🇳 Male 1 v2' },
  { id: 'MALE2v2',   label: '🇲🇳 Male 2 v2' },
  { id: 'MALE3v2',   label: '🇲🇳 Male 3 v2' },
  { id: 'MALE4v2',   label: '🇲🇳 Male 4 v2' },
];

function getElevenLabsVoicesForGenre(genre: string): { id: string; label: string }[] {
  if (['scary', 'trueCrime', 'conspiracy', 'darkHistory'].includes(genre)) return ELEVENLABS_VOICES.scary;
  if (['education', 'sciExplained', 'psychology', 'mythBusting', 'futuristic', 'shockingFacts', 'business', 'stoic', 'survival'].includes(genre)) return ELEVENLABS_VOICES.education;
  if (['history', 'darkHistory', 'mythology', 'biography'].includes(genre)) return ELEVENLABS_VOICES.history;
  return ELEVENLABS_VOICES.education;
}

function getDefaultVoiceId(provider: TtsProvider, genre: string): string {
  if (provider === 'elevenlabs') return getElevenLabsVoicesForGenre(genre)[0].id;
  if (provider === 'gemini')     return 'Kore';
  return 'FEMALE3v2'; // chimege default
}

interface Props {
  onSubmit: (payload: GenerateVideoPayload) => void;
  isLoading: boolean;
}

const GENRES = [
  { id: 'scary',         label: '👻 Scary',          desc: 'Psychological horror' },
  { id: 'trueCrime',     label: '🔪 True Crime',      desc: 'Real dark stories' },
  { id: 'conspiracy',    label: '🕵️ Conspiracy',      desc: 'Hidden truths' },
  { id: 'darkHistory',   label: '💀 Dark History',    desc: 'Haunting past events' },
  { id: 'psychology',    label: '🧠 Psychology',      desc: 'Mind & behaviour' },
  { id: 'mythology',     label: '⚔️ Mythology',       desc: 'Ancient myths' },
  { id: 'stoic',         label: '🧘 Stoic',           desc: 'Wisdom & resilience' },
  { id: 'mythBusting',   label: '💥 Myth Busting',    desc: 'Facts vs fiction' },
  { id: 'survival',      label: '🏕️ Survival',        desc: 'Life or death' },
  { id: 'futuristic',    label: '🚀 Futuristic',      desc: 'Future & tech' },
  { id: 'biography',     label: '📖 Biography',       desc: 'Real life stories' },
  { id: 'shockingFacts', label: '⚡ Shocking Facts',  desc: 'Mind-blowing facts' },
  { id: 'business',      label: '💼 Business',        desc: 'Success & strategy' },
  { id: 'sciExplained',  label: '🔬 Science',         desc: 'Cinematic science' },
  { id: 'education',     label: '📚 Education',       desc: 'Learn & explore' },
];

const LANGUAGES = [
  { id: 'mongolian', label: '🇲🇳 Монгол' },
  { id: 'english',   label: '🇬🇧 English' },
];

const IMAGE_STYLES = [
  { id: 'anime',         label: 'Anime' },
  { id: 'comic',         label: 'Comic' },
  { id: 'creepyComic',   label: 'Creepy Comic' },
  { id: 'modernCartoon', label: 'Cartoon' },
  { id: 'disney',        label: 'Disney' },
  { id: 'simpsons',      label: 'Simpsons' },
];

const TRANSITIONS: { id: TransitionStyle; label: string; desc: string }[] = [
  { id: 'mixed', label: '🎲 Mixed',  desc: 'All types' },
  { id: 'fade',  label: '🌅 Fade',   desc: 'Smooth fades' },
  { id: 'wipe',  label: '🪟 Wipe',   desc: 'Wipe across' },
  { id: 'slide', label: '➡️ Slide',  desc: 'Slide in/out' },
  { id: 'none',  label: '⚡ Cut',    desc: 'Hard cuts' },
];

export function GeneratorForm({ onSubmit, isLoading }: Props) {
  const [topic, setTopic]                     = useState('');
  const [genre, setGenre]                     = useState('scary');
  const [language, setLanguage]               = useState('mongolian');
  const [imageStyle, setImageStyle]           = useState('anime');
  const [duration, setDuration]               = useState(60);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('mixed');
  const [subtitlePreset, setSubtitlePreset]   = useState<string>('classic');
  const [ttsProvider, setTtsProvider]         = useState<TtsProvider>('gemini');
  const [voiceId, setVoiceId]                 = useState<string>('Kore');

  // Voice options depend on provider
  const voiceOptions =
    ttsProvider === 'elevenlabs' ? getElevenLabsVoicesForGenre(genre) :
    ttsProvider === 'gemini'     ? GEMINI_VOICES :
    CHIMEGE_VOICES;

  // When provider changes reset voice to the new provider's default
  const handleProviderChange = (p: TtsProvider) => {
    setTtsProvider(p);
    setVoiceId(getDefaultVoiceId(p, genre));
  };

  // When genre changes reset voice only for ElevenLabs (Gemini/Chimege are genre-independent)
  const handleGenreChange = (g: string) => {
    setGenre(g);
    if (ttsProvider === 'elevenlabs') setVoiceId(getElevenLabsVoicesForGenre(g)[0].id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || isLoading) return;
    const preset = SUBTITLE_PRESETS.find(p => p.id === subtitlePreset);
    onSubmit({
      topic: topic.trim(),
      genre,
      language,
      imageStyle,
      duration,
      transitionStyle,
      ttsProvider,
      voiceId: voiceId || undefined,
      subtitleStyle:    preset?.disabled ? undefined : preset?.style,
      disableSubtitles: preset?.disabled ?? false,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>

      {/* Topic */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Story Topic
        </label>
        <div className={styles.inputWrap}>
          <textarea
            className={styles.textarea}
            placeholder="Enter a topic, title, or idea for your video…"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          <div className={styles.inputGlow} />
        </div>
      </div>

      {/* Genre grid */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Genre
        </label>
        <div className={styles.genreGrid}>
          {GENRES.map(g => (
            <button
              key={g.id}
              type="button"
              className={`${styles.genreCard} ${genre === g.id ? styles.genreActive : ''}`}
              onClick={() => handleGenreChange(g.id)}
              disabled={isLoading}
            >
              <span className={styles.genreLabel}>{g.label}</span>
              <span className={styles.genreDesc}>{g.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TTS Provider */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Voice Engine
        </label>
        <div className={styles.genreGrid}>
          {TTS_PROVIDERS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`${styles.genreCard} ${ttsProvider === p.id ? styles.genreActive : ''}`}
              onClick={() => handleProviderChange(p.id)}
              disabled={isLoading}
            >
              <span className={styles.genreLabel}>{p.label}</span>
              <span className={styles.genreDesc}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice picker */}
      <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.labelDot} />
            Narrator Voice
          </label>
          <div className={styles.pills}>
            {voiceOptions.map(v => (
              <button
                key={v.id}
                type="button"
                className={`${styles.pill} ${voiceId === v.id ? styles.pillActive : ''}`}
                onClick={() => setVoiceId(v.id)}
                disabled={isLoading}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

      {/* Row: Language + Style */}
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.labelDot} />
            Language
          </label>
          <div className={styles.pills}>
            {LANGUAGES.map(l => (
              <button
                key={l.id}
                type="button"
                className={`${styles.pill} ${language === l.id ? styles.pillActive : ''}`}
                onClick={() => setLanguage(l.id)}
                disabled={isLoading}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            <span className={styles.labelDot} />
            Image Style
          </label>
          <div className={styles.pills}>
            {IMAGE_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                className={`${styles.pill} ${imageStyle === s.id ? styles.pillActive : ''}`}
                onClick={() => setImageStyle(s.id)}
                disabled={isLoading}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Transition style */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Transition Style
        </label>
        <div className={styles.genreGrid}>
          {TRANSITIONS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`${styles.genreCard} ${transitionStyle === t.id ? styles.genreActive : ''}`}
              onClick={() => setTransitionStyle(t.id)}
              disabled={isLoading}
            >
              <span className={styles.genreLabel}>{t.label}</span>
              <span className={styles.genreDesc}>{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle style */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Subtitle Style
        </label>
        <div className={styles.pills}>
          {SUBTITLE_PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              className={`${styles.pill} ${subtitlePreset === p.id ? styles.pillActive : ''}`}
              onClick={() => setSubtitlePreset(p.id)}
              disabled={isLoading}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Duration slider */}
      <div className={styles.field}>
        <label className={styles.label}>
          <span className={styles.labelDot} />
          Duration
          <span className={styles.labelValue}>{duration}s</span>
        </label>
        <div className={styles.sliderWrap}>
          <input
            type="range"
            className={styles.slider}
            min={20}
            max={180}
            step={10}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            disabled={isLoading}
          />
          <div className={styles.sliderTicks}>
            {[20, 60, 120, 180].map(v => (
              <span key={v} className={styles.tick}>{v}s</span>
            ))}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        className={`${styles.submitBtn} ${isLoading ? styles.submitLoading : ''}`}
        disabled={isLoading || !topic.trim()}
      >
        {isLoading ? (
          <>
            <span className={styles.spinner} />
            Generating…
          </>
        ) : (
          <>
            <span className={styles.btnIcon}>▶</span>
            Generate Video
          </>
        )}
      </button>
    </form>
  );
}
