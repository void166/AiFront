// ─── Evaluation API ──────────────────────────────────────────────────────────
const API_BASE: string =
  typeof (import.meta as any).env !== 'undefined'
    ? ((import.meta as any).env.VITE_API_URL ?? '')
    : '';

async function apiFetch(
  url: string,
  options: RequestInit,
  token?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json() as { success?: boolean; error?: string; data?: unknown };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data.data ?? data;
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface EvaluationScores {
  hook: number; pacing: number; emotion: number; clarity: number; originality: number;
}
export interface SceneScore {
  sceneIndex: number;
  score:      number;
  weakness?:  string;
}
export interface HealthIssue {
  code:     string;
  message:  string;
  severity: 'info' | 'warning' | 'error';
}
export interface VideoEvaluation {
  id:           string;
  videoId:      string;
  overallScore: number;
  grade:        string;
  scores:       EvaluationScores;
  sceneScores:  SceneScore[];
  suggestions:  string[];
  healthIssues: HealthIssue[];
  userRating:   number | null;
  userLiked:    boolean | null;
}

// ─── API calls ───────────────────────────────────────────────────────────────
export async function evaluateVideo(videoId: string, token?: string): Promise<VideoEvaluation> {
  return await apiFetch(`/api/video/${videoId}/evaluate`, { method: 'POST' }, token) as VideoEvaluation;
}

export async function getEvaluation(videoId: string, token?: string): Promise<VideoEvaluation | null> {
  // apiFetch returns `data.data ?? data`, so when the API responds with
  // `{ success: true, data: null }` the helper falls through and gives us the
  // whole envelope. Detect that case and return null explicitly.
  const result = await apiFetch(`/api/video/${videoId}/evaluation`, { method: 'GET' }, token);
  if (!result || typeof result !== 'object') return null;
  const obj = result as Record<string, unknown>;
  // Either an evaluation row (has overallScore/grade) or the envelope shell
  if (obj.overallScore === undefined && obj.grade === undefined) return null;
  return obj as unknown as VideoEvaluation;
}

export async function setUserRating(
  videoId: string,
  payload: { rating?: number; liked?: boolean | null },
  token?: string,
): Promise<{ userRating: number | null; userLiked: boolean | null }> {
  return await apiFetch(
    `/api/video/${videoId}/evaluation/rating`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  ) as { userRating: number | null; userLiked: boolean | null };
}

// ─── A/B variant generation ─────────────────────────────────────────────────
export interface ScriptVariantScene {
  time:        string;
  scene:       string;
  visual?:     string;
  narration:   string;
  imagePrompt: string;
}
export interface ScriptVariant {
  id:       'A' | 'B';
  title:    string;
  duration: string;
  scenes:   ScriptVariantScene[];
}

export async function generateScriptVariants(
  payload: {
    topic: string;
    genre?: string;
    imageStyle?: string;
    language?: string;
    duration?: number;
    scriptProvider?: 'anthropic' | 'groq';
  },
  token?: string,
): Promise<{ variants: ScriptVariant[] }> {
  return await apiFetch(
    `/api/video/script/variants`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  ) as { variants: ScriptVariant[] };
}
