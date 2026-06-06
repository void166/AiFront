/**
 * Notification API client — talks to /api/notifications/* on the backend.
 *
 * The shape mirrors the existing videoApi/projectApi clients: small helper
 * `apiFetch` that injects the JWT and unwraps `{ success, data }` envelopes.
 */

export type NotificationType =
  | 'video_completed'
  | 'video_failed'
  | 'pdf_processed'
  | 'system';

export interface AppNotification {
  id:        string;
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  link:      string | null;
  data:      Record<string, unknown> | null;
  isRead:    boolean;
  createdAt: string;
  updatedAt: string;
}

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

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json() as { success?: boolean; error?: string; message?: string; data?: unknown };

  if (!res.ok) {
    throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`);
  }
  return data.data ?? data;
}

/** GET /api/notifications — recent list + unread count */
export async function listNotifications(token: string, limit = 30): Promise<{
  notifications: AppNotification[];
  unreadCount:   number;
}> {
  const data = await apiFetch(`/api/notifications?limit=${limit}`, { method: 'GET' }, token);
  return data as { notifications: AppNotification[]; unreadCount: number };
}

/** GET /api/notifications/unread-count — cheap polling endpoint */
export async function getUnreadCount(token: string): Promise<number> {
  const data = await apiFetch('/api/notifications/unread-count', { method: 'GET' }, token);
  return (data as { count: number }).count;
}

/** PATCH /api/notifications/:id/read */
export async function markNotificationRead(id: string, token: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' }, token);
}

/** PATCH /api/notifications/read-all */
export async function markAllNotificationsRead(token: string): Promise<void> {
  await apiFetch('/api/notifications/read-all', { method: 'PATCH' }, token);
}

/** DELETE /api/notifications/:id */
export async function deleteNotification(id: string, token: string): Promise<void> {
  await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' }, token);
}

/** DELETE /api/notifications — clear all */
export async function clearAllNotifications(token: string): Promise<void> {
  await apiFetch('/api/notifications', { method: 'DELETE' }, token);
}
