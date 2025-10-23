import type { StoredProfile } from "./auth-storage";

export type SignupPayload = {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  date_of_birth?: string | null;
  gender?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type ApiResponse<T> = {
  ok: boolean;
  message: string;
  data?: T;
};

const API_BASE = "/api";

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: T;
  try {
    json = text ? JSON.parse(text) : ({} as T);
  } catch {
    throw new Error("Unexpected server response");
  }
  if (!res.ok) {
    const message =
      typeof json === "object" && json !== null && "message" in json
        ? String((json as { message?: unknown }).message ?? res.statusText)
        : res.statusText;
    throw new Error(message);
  }
  return json;
}

export async function signup(payload: SignupPayload) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleJson<{ ok: boolean; message: string }>(res);
  if (!data.ok) throw new Error(data.message || "Signup failed");
  return data;
}

export async function login(payload: LoginPayload) {
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await handleJson<{ ok: boolean; message: string; token?: string }>(res);
  if (!data.ok || !data.token) throw new Error(data.message || "Login failed");
  return data;
}

export async function loginWithGoogle(idToken: string) {
  const res = await fetch(`${API_BASE}/auth/oauth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await handleJson<{ ok: boolean; message: string; token?: string }>(res);
  if (!data.ok || !data.token) throw new Error(data.message || "Google login failed");
  return data;
}

export async function fetchProfile(token: string): Promise<StoredProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleJson<StoredProfile>(res);
}
