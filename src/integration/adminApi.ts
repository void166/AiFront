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

export interface AdminUser {
  id: string;
  email: string;
  fullname: string;
  createdAt: string;
  videoCount: number;
}

export interface AdminVideo {
  id: string;
  userId: string;
  projectId: string | null;
  title: string;
  topic: string;
  genre: string;
  language: string;
  imageStyle: string;
  status: string;
  duration: number | null;
  final_video_url: string | null;
  thumbnail_url: string | null;
  Tfocus: string | null;
  Temotion: string | null;
  ToverLay: string | null;
  TvisualHook: string | null;
  bgmPath: string;
  bgmVolume: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; fullname: string } | null;
}

export interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  completedVideos: number;
  failedVideos: number;
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; admin: any }> {
  const r = await apiFetch('/api/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  return r;
}

export async function adminRegister(email: string, password: string, name: string, secretKey: string): Promise<any> {
  const r = await apiFetch('/api/admin/register', { method: 'POST', body: JSON.stringify({ email, password, name, secretKey }) });
  return r;
}

export async function getAdminStats(token: string): Promise<AdminStats> {
  const r = await apiFetch('/api/admin/stats', { method: 'GET' }, token);
  return r.data;
}

export async function getAdminUsers(token: string, page = 1, limit = 50): Promise<{ users: AdminUser[]; total: number }> {
  const r = await apiFetch(`/api/admin/users?page=${page}&limit=${limit}`, { method: 'GET' }, token);
  return r.data;
}

export async function getAdminVideos(token: string, page = 1, limit = 30, search = ''): Promise<{ videos: AdminVideo[]; pagination: any }> {
  const q = search ? `&search=${encodeURIComponent(search)}` : '';
  const r = await apiFetch(`/api/admin/videos?page=${page}&limit=${limit}${q}`, { method: 'GET' }, token);
  return r.data;
}

export async function getAdminVideoDetail(videoId: string, token: string): Promise<{ video: AdminVideo; user: AdminUser; scenes: any[] }> {
  const r = await apiFetch(`/api/admin/videos/${videoId}`, { method: 'GET' }, token);
  return r.data;
}

export async function adminDeleteVideo(videoId: string, token: string): Promise<void> {
  await apiFetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' }, token);
}
