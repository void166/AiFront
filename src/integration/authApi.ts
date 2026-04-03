// ─── Types ────────────────────────────────────────────────────────────────────
export interface AuthUser {
  /** Database user ID — needed when calling authenticated endpoints */
  id: string;
  token: string;
  email: string;
  fullname?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user?: AuthUser;
  message?: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullname: string;
}

export interface SignupResponse {
  success: boolean;
  user?: { id: string; email: string; fullname: string };
  message?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const data = await postJson('/api/auth/login', payload) as LoginResponse & { user?: AuthUser };
  return data;
}

export async function signUp(payload: SignupPayload): Promise<SignupResponse> {
  const data = await postJson('/api/auth/signup', payload) as SignupResponse;
  return data;
}
