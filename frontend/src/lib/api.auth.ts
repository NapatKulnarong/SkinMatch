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
  identifier: string;
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
    body: JSON.stringify({ identifier: payload.identifier, password: payload.password }),
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

export async function createAdminSession(token: string, profile: StoredProfile) {
  if (!profile.is_staff) {
    throw new Error("User does not have staff privileges");
  }

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  let adminUrl = `${backendBase}/admin/`;

  if (adminUrl.includes("backend:8000")) {
    adminUrl = adminUrl.replace("backend:8000", "localhost:8000");
  }

  return {
    ok: true,
    message: "Admin session available",
    redirect_url: adminUrl,
  };
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

export async function logout(token: string) {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await handleJson<{ ok: boolean; message: string }>(res);
  if (!data.ok) throw new Error(data.message || "Logout failed");
  return data;
}

export type ProfileUpdatePayload = {
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  avatar_url?: string | null;
  remove_avatar?: boolean;
};

export async function updateProfile(
  token: string,
  payload: ProfileUpdatePayload
): Promise<StoredProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return handleJson<StoredProfile>(res);
}

export async function uploadAvatar(token: string, file: File): Promise<StoredProfile> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/auth/me/avatar`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return handleJson<StoredProfile>(res);
}

export async function requestPasswordReset(email: string) {
  const res = await fetch(`${API_BASE}/auth/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleJson<{ ok: boolean }>(res);
}

export async function resetPassword(payload: { uid: string; token: string; new_password: string }) {
  const res = await fetch(`${API_BASE}/auth/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleJson<{ ok: boolean }>(res);
}
