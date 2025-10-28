const TOKEN_KEY = "sm_token";
const PROFILE_KEY = "sm_profile";

export type StoredProfile = {
  u_id: string;
  username: string;
  email?: string | null;
  is_verified: boolean;
  created_at: string;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  is_staff: boolean;
  is_superuser: boolean;
  first_name?: string | null;
  last_name?: string | null;
};

export const PROFILE_EVENT = "sm-profile-changed";

const PUBLIC_BACKEND_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000").replace(/\/$/, "");

const BACKEND_HOST_PATTERN = /^https?:\/\/backend(?::\d+)?/i;

function normaliseAvatarUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/")) {
    return `${PUBLIC_BACKEND_BASE}${trimmed}`;
  }
  if (BACKEND_HOST_PATTERN.test(trimmed)) {
    return trimmed.replace(BACKEND_HOST_PATTERN, PUBLIC_BACKEND_BASE);
  }
  return trimmed;
}

export function normalizeStoredProfile(profile: StoredProfile): StoredProfile {
  return {
    ...profile,
    avatar_url: normaliseAvatarUrl(profile.avatar_url),
  };
}

function emitProfileEvent(profile: StoredProfile | null) {
  if (typeof window === "undefined") return;
  try {
    const event = new CustomEvent(PROFILE_EVENT, {
      detail: profile,
    } as CustomEventInit<StoredProfile | null>);
    window.dispatchEvent(event);
  } catch {
    // Fallback for environments without CustomEvent constructor
    window.dispatchEvent(new Event(PROFILE_EVENT));
  }
}

export function setAuthToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

export function saveProfile(profile: StoredProfile) {
  if (typeof window === "undefined") return;
  const normalised = normalizeStoredProfile(profile);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(normalised));
  emitProfileEvent(normalised);
}

export function getStoredProfile(): StoredProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredProfile;
    const normalized = normalizeStoredProfile(parsed);
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (error) {
    console.warn("Failed to parse stored profile", error);
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
  emitProfileEvent(null);
}

export function clearSession() {
  clearAuthToken();
  clearStoredProfile();
}
