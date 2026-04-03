// ─── Generation step ──────────────────────────────────────────────────────────
export type GenerationStep =
  | 'idle'
  | 'writing_script'
  | 'generating_images'
  | 'generating_audio'
  | 'rendering_video'
  | 'complete'
  | 'error';

// ─── Transition types ─────────────────────────────────────────────────────────
/** High-level style sent by the form (frontend convenience) */
export type TransitionStyle = 'mixed' | 'fade' | 'wipe' | 'slide' | 'none';

/** Exact ffmpeg preset used by the backend & EditStudio */
export type SceneTransitionPreset =
  | 'auto'
  | 'fadeblack'
  | 'fade'
  | 'wiperight'
  | 'wipeleft'
  | 'hard-cut';

// ─── Subtitle style ───────────────────────────────────────────────────────────
export interface SubtitleStyleOptions {
  fontSize?: number;
  bold?: boolean;
  primaryColor?: string;
  outlineColor?: string;
  outlineThickness?: number;
  shadowDepth?: number;
  alignment?: number;
  marginV?: number;
  backgroundBox?: boolean;
  boxColor?: string;
  boxOpacity?: number;
}

// ─── TTS provider ─────────────────────────────────────────────────────────────
export type TtsProvider = 'elevenlabs' | 'gemini' | 'chimege';

// ─── Scene ────────────────────────────────────────────────────────────────────
export interface SceneData {
  /** DB UUID — returned after video is saved; used for reGenImage / reGenNarration */
  id?: string;
  time: string;
  scene: string;
  narration?: string;
  description?: string;
  imagePrompt?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration: number;
  words?: unknown[];
  transition?: string;
  ttsProvider?: TtsProvider;
}

// ─── Script provider ──────────────────────────────────────────────────────────
export type ScriptProvider = 'groq' | 'anthropic';

// ─── Video generation payload (sent by GeneratorForm) ────────────────────────
export interface GenerateVideoPayload {
  topic: string;
  genre?: string;
  language?: string;
  imageStyle?: string;
  duration?: number;
  transitionStyle?: TransitionStyle;
  voiceId?: string;
  ttsProvider?: TtsProvider;
  scriptProvider?: ScriptProvider;
  subtitleStyle?: SubtitleStyleOptions;
  disableSubtitles?: boolean;
}

// ─── Library video (returned from GET /api/video/) ───────────────────────────
export interface LibraryVideo {
  id: string;
  title: string;
  topic: string;
  genre: string;
  language: string;
  imageStyle: string;
  status: string;
  duration: number;
  final_video_url: string | null;
  thumbnail_url: string | null;
  /** Thumbnail metadata fields (may be absent on older records) */
  Tfocus?: string | null;
  Temotion?: string | null;
  ToverLay?: string | null;
  TvisualHook?: string | null;
  bgmPath: string;
  bgmVolume: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Video result ─────────────────────────────────────────────────────────────
export interface VideoOptions {
  genre?: string;
  bgmPath?: string;
  language?: string;
  imageStyle?: string;
}

export interface VideoData {
  videoId: string;
  videoUrl: string;
  title?: string;
  topic?: string;
  scenes: SceneData[];
  srtPath?: string;
  duration?: number;
  options?: VideoOptions;
  dbId?: string;
}
