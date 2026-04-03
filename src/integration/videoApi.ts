import type {
  GenerateVideoPayload,
  VideoData,
  SceneData,
  SubtitleStyleOptions,
  SceneTransitionPreset,
  LibraryVideo,
} from './types';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Dev:  Vite proxy rewrites /api → localhost:4900, so API_BASE = ''
// Prod (Vercel → Railway): set VITE_API_URL=https://your-app.railway.app
//       in Vercel's environment variables.
const API_BASE: string =
  typeof (import.meta as any).env !== 'undefined'
    ? ((import.meta as any).env.VITE_API_URL ?? '')
    : '';

// ─── Internal fetch helper ────────────────────────────────────────────────────
async function apiFetch(
  url: string,
  options: RequestInit,
  token?: string,
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json() as { success?: boolean; error?: string; message?: string; data?: unknown };

  if (!res.ok) {
    throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
  }
  return data.data ?? data;
}

// ─── Generate video ───────────────────────────────────────────────────────────
/**
 * Kick off video generation.
 * Pass the JWT `token` (from AuthContext) so the backend auth middleware
 * accepts the request, and `userId` so it can save the video to the DB.
 */
export async function generateVideo(
  payload: GenerateVideoPayload & { userId?: string },
  token?: string,
): Promise<VideoData> {
  const data = await apiFetch(
    '/api/video/generate',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
  return data as VideoData;
}

// ─── Get video status ─────────────────────────────────────────────────────────
export async function getVideoStatus(
  videoId: string,
  token?: string,
): Promise<VideoData> {
  const data = await apiFetch(
    `/api/video/${videoId}`,
    { method: 'GET' },
    token,
  );
  return data as VideoData;
}

// ─── Regenerate a scene ───────────────────────────────────────────────────────
export interface RegenerateScenePayload {
  regenerateWhat: 'audio' | 'image' | 'both';
  imagePrompt?: string;
  narration?: string;
  time?: string;
  scene?: string;
}

export async function regenerateScene(
  videoId: string,
  sceneIndex: number,
  payload: RegenerateScenePayload,
  token?: string,
): Promise<{ scenes: SceneData[] }> {
  const data = await apiFetch(
    `/api/video/${videoId}/regenerate/${sceneIndex}`,
    { method: 'POST', body: JSON.stringify({ ...payload, sceneIndex }) },
    token,
  );
  return data as { scenes: SceneData[] };
}

// ─── Re-assemble video ────────────────────────────────────────────────────────
export interface ReAssemblePayload {
  scenes: SceneData[];
  title?: string;
  sceneTransitions?: SceneTransitionPreset[];
  subtitleStyle?: SubtitleStyleOptions;
  disableSubtitles?: boolean;
  bgmPath?: string;
  bgmVolume?: string;
  genre?: string;
}

export async function reAssembleVideo(
  videoId: string,
  payload: ReAssemblePayload,
  token?: string,
): Promise<{ videoUrl: string }> {
  const data = await apiFetch(
    `/api/video/${videoId}/reassemble`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
  return data as { videoUrl: string };
}

// ─── Regen scene text (AI rewrite) ───────────────────────────────────────────
export interface RegenTextPayload {
  what: 'narration' | 'imagePrompt' | 'both';
  scene?: string;
  time?: string;
  narration?: string;
  imagePrompt?: string;
  genre?: string;
}

export async function regenSceneText(
  videoId: string,
  payload: RegenTextPayload,
  token?: string,
): Promise<{ narration?: string; imagePrompt?: string }> {
  const data = await apiFetch(
    `/api/video/${videoId}/regen-text`,
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
  return data as { narration?: string; imagePrompt?: string };
}

// ─── ReGen scene image (by DB scene id) ──────────────────────────────────────
/**
 * PATCH /api/video/scene/:id/image
 * Updates imagePrompt + regenerates the image for a specific scene.
 * Returns the new Cloudinary imageUrl.
 */
export async function reGenSceneImage(
  sceneId: string,
  imagePrompt: string,
  token?: string,
): Promise<{ imageUrl: string }> {
  const data = await apiFetch(
    `/api/video/scene/${sceneId}/image`,
    { method: 'PATCH', body: JSON.stringify({ imagePrompt }) },
    token,
  );
  return data as { imageUrl: string };
}

// ─── Get user's video library ────────────────────────────────────────────────
export async function getUserVideos(
  token: string,
  page = 1,
  limit = 20,
): Promise<{ videos: LibraryVideo[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> {
  const data = await apiFetch(
    `/api/video/?page=${page}&limit=${limit}`,
    { method: 'GET' },
    token,
  );
  return data as any;
}

// ─── Delete a video ───────────────────────────────────────────────────────────
export async function deleteVideo(videoId: string, token: string): Promise<void> {
  await apiFetch(`/api/video/${videoId}`, { method: 'DELETE' }, token);
}

// ─── ReGen scene narration audio (by DB scene id) ────────────────────────────
/**
 * PATCH /api/video/scene/:id/narration
 * Updates narration text + regenerates audio using the scene's stored ttsProvider.
 * Returns the new Cloudinary audioUrl and duration.
 */
export async function reGenSceneNarration(
  sceneId: string,
  narration: string,
  token?: string,
): Promise<{ audioUrl: string; duration: number }> {
  const data = await apiFetch(
    `/api/video/scene/${sceneId}/narration`,
    { method: 'PATCH', body: JSON.stringify({ narration }) },
    token,
  );
  return data as { audioUrl: string; duration: number };
}
