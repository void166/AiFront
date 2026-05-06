const API_BASE: string =
  typeof (import.meta as any).env !== 'undefined'
    ? ((import.meta as any).env.VITE_API_URL ?? '')
    : '';

async function apiFetch(url: string, options: RequestInit, token?: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data.message ?? data.error ?? `HTTP ${res.status}`);
  return data;
}

export interface ProjectData {
  id: string;
  userId: string;
  title: string;
  topic: string;
  status: string;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectVideo {
  id: string;
  title: string;
  topic: string;
  genre: string;
  status: string;
  duration: number | null;
  final_video_url: string | null;
  thumbnail_url: string | null;
  Tfocus: string | null;
  createdAt: string;
}

export async function createProject(title: string, token: string): Promise<ProjectData> {
  const r = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify({ title, topic: title }) }, token);
  return r.data;
}

export async function getProjects(token: string): Promise<{ projects: ProjectData[]; unassignedCount: number }> {
  const r = await apiFetch('/api/projects', { method: 'GET' }, token);
  return r.data;
}

export async function getProjectDetails(id: string, token: string): Promise<{ project: ProjectData; videos: ProjectVideo[] }> {
  const r = await apiFetch(`/api/projects/${id}`, { method: 'GET' }, token);
  return r.data;
}

export async function getUnassignedVideos(token: string): Promise<{ videos: ProjectVideo[] }> {
  const r = await apiFetch('/api/projects/unassigned', { method: 'GET' }, token);
  return r.data;
}

export async function renameProject(id: string, title: string, token: string): Promise<ProjectData> {
  const r = await apiFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }, token);
  return r.data;
}

export async function deleteProject(id: string, token: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, { method: 'DELETE' }, token);
}

export async function moveVideo(videoId: string, projectId: string | null, token: string): Promise<void> {
  await apiFetch('/api/projects/move', { method: 'PATCH', body: JSON.stringify({ videoId, projectId }) }, token);
}
